import json
from datetime import datetime, timezone
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

from django.test import TestCase

from workspace.models import Report, UserProfile, UserSession, WorkSession
from workspace.views import digest, now_ms, protect, time_data


class WorkspaceTests(TestCase):
    def setUp(self):
        self.user = UserProfile.objects.create(
            id=1, login="developer", joined=now_ms() - 86400000
        )
        UserSession.objects.create(
            id=digest("session"),
            user=self.user,
            token=protect("fake-access"),
            expires=now_ms() + 60000,
        )
        self.client.cookies["dc_session"] = "session"

    def post(self, path, data=None):
        return self.client.post(
            path,
            json.dumps(data or {}),
            content_type="application/json",
            HTTP_ORIGIN="http://testserver",
        )

    def test_config_needs_no_schema_mutation(self):
        with self.assertNumQueries(0):
            self.assertEqual(self.client.get("/api/config").status_code, 200)

    def test_csrf_and_methods(self):
        self.assertEqual(self.client.get("/api/me/time/start").status_code, 405)
        self.assertEqual(
            self.client.post(
                "/api/me/time/start", "{}", content_type="application/json"
            ).status_code,
            403,
        )
        self.client.cookies.clear()
        self.assertEqual(self.post("/api/me/time/start").status_code, 401)

    def test_timer_retries_and_stop_isolation(self):
        first = self.post("/api/me/time/start").json()["active"]["id"]
        self.assertEqual(first, self.post("/api/me/time/start").json()["active"]["id"])
        self.post("/api/me/time/stop", {"id": first})
        second = self.post("/api/me/time/start").json()["active"]["id"]
        self.assertEqual(
            second, self.post("/api/me/time/stop", {"id": first}).json()["active"]["id"]
        )
        other = UserProfile.objects.create(id=2, login="other", joined=now_ms())
        WorkSession.objects.create(id="other-session", user=other, started=now_ms())
        self.post("/api/me/time/stop", {"id": "other-session"})
        self.assertIsNone(WorkSession.objects.get(pk="other-session").ended)

    def test_public_card_excludes_readmes(self):
        Report.objects.create(
            key="profile:1",
            saved=now_ms(),
            value={
                "user": {"login": "developer"},
                "repos": [],
                "profileReadme": "private context",
                "projectReadmes": ["context"],
            },
        )
        self.assertEqual(self.client.get("/api/me/profile").status_code, 200)
        data = self.client.get("/api/cards/developer").json()
        self.assertNotIn("profileReadme", data)
        self.post("/api/me/share", {"publish": False})
        self.client.cookies.clear()
        self.assertEqual(self.client.get("/api/cards/developer").status_code, 200)
        self.assertEqual(self.client.get("/api/me/time").status_code, 401)

    def test_timer_midnight_dst_and_calendar_average(self):
        self.user.timezone = "America/New_York"
        self.user.joined = int(
            datetime(2026, 3, 7, tzinfo=timezone.utc).timestamp() * 1000
        )
        start = int(datetime(2026, 3, 8, 5, tzinfo=timezone.utc).timestamp() * 1000)
        end = int(datetime(2026, 3, 9, 4, tzinfo=timezone.utc).timestamp() * 1000)
        WorkSession.objects.create(id="dst", user=self.user, started=start, ended=end)
        with patch("workspace.views.now_ms", return_value=end):
            data = time_data(self.user)
        self.assertEqual(data["daily"]["2026-03-08"], 23 * 3600000)
        self.assertEqual(data["elapsedDays"], 4)

    @patch.dict("os.environ", {"GITHUB_CLIENT_ID": "test"})
    def test_oauth_pkce_format(self):
        query = parse_qs(urlparse(self.client.get("/auth/github")["Location"]).query)
        challenge = query["code_challenge"][0]
        self.assertEqual(len(challenge), 43)
        self.assertNotIn("=", challenge)

    def test_analysis_persists_beyond_daily_window(self):
        value = {"schemaVersion": 2, "summary": "saved", "strengths": [], "suggestions": []}
        Report.objects.create(key="ai:1", value=value, saved=now_ms()-10*86400000)
        with patch("workspace.views.requests.post") as external:
            self.assertEqual(self.post("/api/me/ai").json(), value)
            external.assert_not_called()

    @patch.dict("os.environ", {"GEMINI_API_KEY": "test"})
    def test_image_daily_limit_is_enforced_on_server(self):
        Report.objects.create(key="limit:image:1", value={}, saved=now_ms()-3600000)
        with patch("workspace.views.profile_data", return_value={"user":{},"repos":[]}), patch("workspace.views.requests.post") as external:
            self.assertEqual(self.post("/api/me/image").status_code, 429)
            external.assert_not_called()

    def test_timezone_defaults_to_tehran_and_preserves_choice(self):
        self.assertEqual(self.user.timezone, "Asia/Tehran")
        self.assertEqual(self.client.get('/api/me/time').json()['timezone'], 'Asia/Tehran')
        self.assertEqual(self.post('/api/me/timezone', {'timezone':'UTC'}).status_code, 200)
        self.assertEqual(self.client.get('/api/me/time').json()['timezone'], 'UTC')

    def test_calendar_rejects_years_outside_account_lifetime(self):
        with patch('workspace.views.profile_data', return_value={'user':{'created_at':'2020-05-10T00:00:00Z'}}), patch('workspace.views.requests.post') as external:
            for year in ['2019', '9999', 'invalid']:
                self.assertEqual(self.client.get('/api/me/activity', {'year':year}).status_code, 400)
            external.assert_not_called()


    def test_introduction_is_cached_and_only_published_for_public_cards(self):
        value = {"schemaVersion": 2, "resume": ["اول", "دوم", "سوم"]}
        Report.objects.create(key="ai:1", value=value, saved=now_ms())
        with patch("workspace.views.requests.post") as external:
            self.assertEqual(self.post("/api/me/introduction").json()["resume"], value["resume"])
            external.assert_not_called()
        self.assertEqual(self.client.get("/api/cards/developer").status_code, 404)
        self.user.card = {"user": {"login":"developer"}, "repos":[]}
        self.user.published = True
        self.user.save()
        self.assertEqual(self.client.get("/api/cards/developer").json()["analysis"], value)

    def test_telegram_card_upload_over_default_django_limit(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        card = SimpleUploadedFile('card.png', b'png' + b'x' * (3 * 1024 * 1024), content_type='image/png')
        with patch('workspace.telegram.publish', return_value={'message_id': 123}) as publish:
            response = self.client.post('/api/me/telegram/publish', {'theme':'cherry-noir','image':card}, HTTP_ORIGIN='http://testserver')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()['messageId'], 123)
            self.assertEqual(len(publish.call_args.kwargs['card_image'][0]), 3 * 1024 * 1024 + 3)


    @patch.dict("os.environ", {"GEMINI_API_KEY": "test"})
    def test_one_ai_generation_serves_analysis_resume_and_public_card(self):
        result = {"title":"عنوان", "summary":"تحلیل", "resume":["یک", "دو", "سه"], "skills":[{"name":"Python", "evidence":"README", "source":"self_reported"}], "strengths":[], "suggestions":[], "imagePrompt":"A developer robot"}
        with patch("workspace.views.profile_data", return_value={"user":{"login":"developer"}, "profileReadme":"I use Python", "repos":[], "projectReadmes":[]}), patch("workspace.views.requests.post") as external:
            external.return_value.ok = True
            external.return_value.json.return_value = {"candidates":[{"content":{"parts":[{"text":json.dumps(result)}]}}]}
            first = self.post("/api/me/ai")
            self.assertEqual(first.status_code, 200)
            self.assertEqual(first.json()["title"], "عنوان")
            self.assertEqual(self.post("/api/me/introduction").json()["lines"], result["resume"])
            self.assertEqual(self.post("/api/me/ai").json(), first.json())
            external.assert_called_once()
            prompt = external.call_args.kwargs["json"]["contents"][0]["parts"][0]["text"]
            self.assertIn("I use Python", prompt)
