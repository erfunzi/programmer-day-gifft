"""A durable database outbox; delivery is at-least-once, never exactly-once."""

import logging

from django.conf import settings
from django.db import transaction
from django.http import JsonResponse

from .models import BackgroundJob, OutboxEvent, Report, UserProfile, UserSession
from .views import api, json_error, now_ms, reveal, session_user


def serialize(job):
    return {
        "id": job.pk,
        "kind": job.kind,
        "state": job.state,
        "created": job.created,
        "updated": job.updated,
        "error": job.error,
    }


def enqueue(user, kind, data=None, image=None):
    with transaction.atomic():
        UserProfile.objects.select_for_update().get(pk=user.pk)
        job = BackgroundJob.objects.filter(
            user=user, kind=kind, state__in=["pending", "running", "unknown"]
        ).first()
        if job:
            return job
        job = BackgroundJob.objects.create(
            user=user,
            kind=kind,
            data=data or {},
            image=image,
            created=now_ms(),
            updated=now_ms(),
        )
        OutboxEvent.objects.create(job=job)
        return job


@api
def status(request):
    user = session_user(request)
    if not user:
        return json_error("برای ادامه با GitHub وارد شو.", 401)
    return JsonResponse(
        {
            "jobs": [
                serialize(row)
                for row in BackgroundJob.objects.filter(user=user).order_by("-created")[
                    :20
                ]
            ]
        }
    )


@api
def preview(request):
    user = session_user(request)
    if not user:
        return json_error("برای ادامه با GitHub وارد شو.", 401)
    if not settings.STUDIO_TELEGRAM_PREVIEW:
        return json_error("Preview temporarily unavailable", 503)
    from .studio import effective_analysis
    from .telegram import profile_for_caption, publication_markup, render_caption

    report = Report.objects.filter(key=f"ai:{user.pk}").first()
    import html
    import re

    caption = render_caption(
        profile_for_caption(user),
        user.theme,
        effective_analysis(user, report.value if report else None),
    )
    return JsonResponse(
        {
            "caption": caption,
            "plainCaption": html.unescape(re.sub("<[^>]*>", "", caption)),
            "markup": publication_markup(user, user.theme),
            "imageLanguage": "en",
        }
    )


def run_job(job_id):
    with transaction.atomic():
        job = BackgroundJob.objects.select_for_update().get(pk=job_id)
        if job.state != "pending":
            return
        job.state, job.updated = "running", now_ms()
        job.save(update_fields=["state", "updated"])
    user = job.user
    try:
        if job.kind == "ai":
            session = (
                UserSession.objects.filter(user=user, expires__gt=now_ms())
                .order_by("-expires")
                .first()
            )
            access = reveal(session.token) if session else None
            if not access:
                raise ValueError("reauth_required")
            user._access = access
            from .views import generate_ai

            generate_ai(user)
        elif job.kind == "telegram":
            from .telegram import publish

            result = publish(
                user,
                job.data["theme"],
                refresh=job.data["refresh"],
                card_image=(bytes(job.image), job.data["mime"]),
            )
            job.data = {
                **job.data,
                "messageId": result.get("message_id"),
                "created": result.get("created", False),
            }
        else:
            raise ValueError("unsupported_job")
        job.state, job.error = "succeeded", ""
    except Exception as exc:  # noqa: BLE001 — persist uncertainty even after an unexpected worker error.
        # A provider response may have been lost after accepting sendPhoto.
        # Never retry an ambiguous Telegram attempt automatically.
        from .telegram import PublicationUnavailable
        from .views import AICooldown

        if job.kind == "ai" and not isinstance(exc, AICooldown):
            Report.objects.filter(key=f"limit:ai:{user.pk}").delete()
        job.state = (
            "failed"
            if job.kind == "ai" or isinstance(exc, PublicationUnavailable)
            else "unknown"
        )
        job.error = (
            "reauth_required"
            if str(exc) == "reauth_required"
            else (
                "publication_unavailable"
                if isinstance(exc, PublicationUnavailable)
                else "upstream_failed"
            )
        )
    job.updated = now_ms()
    job.image = None
    job.save(update_fields=["state", "error", "updated", "data", "image"])
    logging.getLogger(__name__).info(
        "studio_job id=%s kind=%s state=%s elapsed_ms=%s",
        job.pk,
        job.kind,
        job.state,
        job.updated - job.created,
    )


def recover_stale():
    # Bound below the maximum task execution time; do not re-send orphaned jobs.
    stale = BackgroundJob.objects.filter(
        state="running", updated__lt=now_ms() - 1800000
    )
    stale.filter(kind="telegram").update(
        state="unknown", error="worker_interrupted", image=None, updated=now_ms()
    )
    stale.filter(kind="ai").update(
        state="failed", error="worker_interrupted", updated=now_ms()
    )
