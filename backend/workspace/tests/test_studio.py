import json
from unittest import skipUnless
from unittest.mock import patch

import requests
from django.core.management import call_command
from django.db import connection
from django.test import TestCase, TransactionTestCase, override_settings

from workspace.jobs import enqueue, recover_stale, run_job
from workspace.models import (
    ActivitySnapshot,
    BackgroundJob,
    CardRevision,
    JobAudit,
    OutboxEvent,
    Report,
    UserProfile,
    UserSession,
    WeeklyGoal,
)
from workspace.studio import effective_analysis, record_snapshot
from workspace.views import digest, now_ms, protect


class StudioTests(TestCase):
    def setUp(self):
        self.user = UserProfile.objects.create(
            id=100,
            login="builder",
            joined=now_ms(),
            card={
                "user": {"login": "builder"},
                "repos": [{"name": "tool", "private": False}],
            },
        )
        UserSession.objects.create(
            id=digest("studio-session"),
            user=self.user,
            token=protect("test-token"),
            expires=now_ms() + 3600000,
        )
        self.client.cookies["dc_session"] = "studio-session"
        self.value = {
            "locales": {"fa": {"role": "سازنده"}, "en": {"role": "Builder"}},
            "links": [{"label": "Site", "url": "https://example.com"}],
            "projects": [
                {
                    "name": "tool",
                    "fa": {"problem": "مسئله"},
                    "en": {"outcome": "Useful"},
                }
            ],
        }

    def post(self, path, data):
        return self.client.post(
            path,
            json.dumps(data),
            content_type="application/json",
            HTTP_ORIGIN="http://testserver",
        )

    def test_draft_is_private_apply_and_restore_are_append_only(self):
        self.assertEqual(
            self.post(
                "/api/me/editor", {"version": 0, "action": "draft", "value": self.value}
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.get("/api/cards/builder").json()["editor"]["locales"], {}
        )
        self.assertEqual(
            self.post(
                "/api/me/editor", {"version": 0, "action": "apply", "value": self.value}
            ).status_code,
            409,
        )
        self.assertEqual(
            self.post(
                "/api/me/editor", {"version": 1, "action": "apply", "value": self.value}
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.get("/api/cards/builder").json()["editor"]["locales"]["en"][
                "role"
            ],
            "Builder",
        )
        self.value["locales"]["en"]["role"] = "New role"
        self.post(
            "/api/me/editor", {"version": 2, "action": "apply", "value": self.value}
        )
        self.assertEqual(
            self.post(
                "/api/me/editor", {"version": 3, "action": "restore", "revision": 1}
            ).status_code,
            200,
        )
        self.assertEqual(CardRevision.objects.filter(user=self.user).count(), 3)
        self.assertEqual(
            CardRevision.objects.get(user=self.user, number=3).restored_from, 1
        )
        self.assertEqual(
            self.client.get("/api/cards/builder").json()["editor"]["locales"]["en"][
                "role"
            ],
            "Builder",
        )

    def test_owner_isolation_validation_and_original_ai_preserved(self):
        generated = {
            "schemaVersion": 3,
            "locales": {"en": {"role": "Generated"}, "fa": {"role": "اصلی"}},
        }
        Report.objects.create(key=f"ai:{self.user.pk}", value=generated, saved=now_ms())
        other = UserProfile.objects.create(id=101, login="other", joined=now_ms())
        CardRevision.objects.create(user=other, number=88, value={}, created=now_ms())
        self.assertEqual(
            self.post(
                "/api/me/editor", {"version": 0, "action": "restore", "revision": 88}
            ).status_code,
            404,
        )
        self.value["links"][0]["url"] = "javascript:alert(1)"
        self.assertEqual(
            self.post(
                "/api/me/editor", {"version": 0, "action": "apply", "value": self.value}
            ).status_code,
            400,
        )
        self.value["links"] = []
        self.value["projects"] = [{"name": "private-repo"}]
        self.assertEqual(
            self.post(
                "/api/me/editor", {"version": 0, "action": "apply", "value": self.value}
            ).status_code,
            400,
        )
        self.value["projects"] = []
        self.post(
            "/api/me/editor", {"version": 0, "action": "apply", "value": self.value}
        )
        self.assertEqual(
            effective_analysis(self.user, generated)["locales"]["en"]["role"], "Builder"
        )
        self.assertEqual(Report.objects.get(key=f"ai:{self.user.pk}").value, generated)
        self.client.cookies.clear()
        for path in ("editor", "snapshots", "goal", "jobs", "telegram/preview"):
            self.assertEqual(self.client.get("/api/me/" + path).status_code, 401)

    def test_goal_and_project_timer(self):
        self.assertEqual(self.post("/api/me/goal", {"minutes": True}).status_code, 400)
        self.post("/api/me/goal", {"minutes": 60})
        self.post("/api/me/goal", {"minutes": 120})
        self.assertEqual(WeeklyGoal.objects.count(), 1)
        active = self.post("/api/me/time/start", {"project": "tool"}).json()["active"]
        self.assertEqual(active["project"], "tool")
        again = self.post("/api/me/time/start", {"project": "other"}).json()["active"]
        self.assertEqual(active, again)

    def test_health_and_rollback_flags(self):
        self.assertEqual(self.client.get("/api/health").json(), {"status": "ok"})
        with override_settings(STUDIO_EDITOR=False):
            self.assertFalse(self.client.get("/api/config").json()["studio"]["editor"])
            self.assertEqual(
                self.post(
                    "/api/me/editor",
                    {"version": 0, "action": "apply", "value": self.value},
                ).status_code,
                503,
            )
        self.assertEqual(CardRevision.objects.count(), 0)

    def test_outbox_recovers_lost_broker_delivery(self):
        from workspace.tasks import dispatch_outbox

        job = enqueue(self.user, "ai")
        with patch("workspace.tasks.execute_job.delay") as dispatch:
            dispatch_outbox()
            dispatch.assert_called_once_with(job.pk)
            dispatch_outbox()
            dispatch.assert_called_once()
            OutboxEvent.objects.filter(job=job).update(dispatched=1)
            dispatch_outbox()
            self.assertEqual(dispatch.call_count, 2)

    def test_snapshots_and_csv_are_private_and_no_fabricated_history(self):
        value = {
            "year": 2026,
            "comparisonYear": 2025,
            "current": {"days": [{"date": "2026-01-01", "count": 3}], "commits": 2},
            "previous": {},
        }
        record_snapshot(self.user, value)
        record_snapshot(self.user, value)
        self.assertEqual(ActivitySnapshot.objects.count(), 1)
        response = self.client.get("/api/me/snapshots?format=csv")
        self.assertIn(",3,2,", response.content.decode())
        public = self.client.get("/api/cards/builder").json()
        self.assertNotIn("snapshots", public)
        self.assertNotIn("goal", public)

    @patch("workspace.telegram.publish", side_effect=requests.Timeout())
    def test_ambiguous_send_blocks_all_retries_until_reconciled(self, publish):
        first = enqueue(
            self.user,
            "telegram",
            {"theme": "solar-forge", "refresh": False, "mime": "image/png"},
            b"png",
        )
        self.assertEqual(enqueue(self.user, "telegram").pk, first.pk)
        run_job(first.pk)
        first.refresh_from_db()
        self.assertEqual(first.state, "unknown")
        self.assertIsNone(first.image)
        run_job(first.pk)
        self.assertEqual(enqueue(self.user, "telegram").pk, first.pk)
        publish.assert_called_once()
        call_command(
            "reconcile_telegram",
            str(first.pk),
            "--actor",
            "test-admin",
            "--note",
            "Checked channel; absent",
            "--confirmed-absent",
            verbosity=0,
        )
        self.assertEqual(JobAudit.objects.count(), 1)
        self.assertNotEqual(enqueue(self.user, "telegram").pk, first.pk)

    def test_expired_credentials_and_worker_crash_preserve_last_good(self):
        Report.objects.create(
            key=f"ai:{self.user.pk}",
            value={"locales": {"fa": {"role": "old"}}},
            saved=1,
        )
        UserSession.objects.all().delete()
        job = enqueue(self.user, "ai")
        with patch("workspace.views.generate_ai") as generate:
            run_job(job.pk)
            generate.assert_not_called()
        job.refresh_from_db()
        self.assertEqual(job.error, "reauth_required")
        self.assertEqual(Report.objects.get(key=f"ai:{self.user.pk}").saved, 1)
        telegram = enqueue(self.user, "telegram")
        BackgroundJob.objects.filter(pk=telegram.pk).update(state="running", updated=1)
        recover_stale()
        telegram.refresh_from_db()
        self.assertEqual(telegram.state, "unknown")

    @override_settings(STUDIO_ASYNC_JOBS=True)
    @patch("workspace.views.profile_data", return_value={"user": {}, "repos": []})
    def test_async_ai_requests_coalesce_and_do_not_call_model(self, profile):
        with patch("workspace.views.generate_ai_text") as generate:
            a = self.post("/api/me/ai", {}).json()
            b = self.post("/api/me/ai", {}).json()
            self.assertEqual(a["job"]["id"], b["job"]["id"])
            self.assertEqual(OutboxEvent.objects.count(), 1)
            generate.assert_not_called()


class JobTransactionTests(TransactionTestCase):
    @skipUnless(
        connection.vendor == "postgresql", "Row-lock concurrency requires PostgreSQL"
    )
    def test_concurrent_enqueues_coalesce(self):
        from concurrent.futures import ThreadPoolExecutor
        from threading import Barrier

        from django.db import close_old_connections, connections

        user = UserProfile.objects.create(id=104, login="concurrent", joined=now_ms())
        barrier = Barrier(4)

        def submit(_):
            close_old_connections()
            try:
                barrier.wait(timeout=10)
                return enqueue(UserProfile.objects.get(pk=user.pk), "ai").pk
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=4) as pool:
            ids = list(pool.map(submit, range(4)))
        self.assertEqual(len(set(ids)), 1)
        self.assertEqual(OutboxEvent.objects.count(), 1)

    def test_external_io_does_not_hold_transaction_and_job_is_only_run_once(self):
        user = UserProfile.objects.create(id=103, login="transaction", joined=now_ms())
        job = enqueue(
            user,
            "telegram",
            {"theme": "aurora-mint", "refresh": False, "mime": "image/png"},
            b"png",
        )

        def send(*args, **kwargs):
            self.assertFalse(connection.in_atomic_block)
            return {"message_id": 1, "created": True}

        with patch("workspace.telegram.publish", side_effect=send) as publish:
            run_job(job.pk)
            run_job(job.pk)
            publish.assert_called_once()
