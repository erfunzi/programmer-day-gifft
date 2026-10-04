"""Owner-only editing and insights. Public projection is explicit and separate."""

import csv
import io
from datetime import datetime, timedelta
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db import DatabaseError, connection, transaction
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import (
    ActivitySnapshot,
    CardDraft,
    CardRevision,
    Report,
    UserProfile,
    WeeklyGoal,
)
from .public_data import public_analysis, public_card_payload
from .views import api, json_error, now_ms, payload, session_user, time_data

TEXT_FIELDS = {
    "role": 100,
    "sloganLead": 60,
    "slogan": 32,
    "title": 240,
    "summary": 2000,
    "telegramText": 420,
}
LIST_FIELDS = {
    "resume": (5, 1500),
    "strengths": (8, 600),
    "suggestions": (8, 600),
    "traits": (4, 80),
}


class EditorValidationError(ValueError):
    """Invalid user-supplied editor content."""


def clean_editor(raw, source):
    if not isinstance(raw, dict):
        raise EditorValidationError("Invalid editor data")

    def text(value, limit):
        if not isinstance(value, str) or len(value) > limit:
            raise EditorValidationError("Text is too long or invalid")
        return value.strip()

    locales = raw.get("locales", {})
    if not isinstance(locales, dict):
        raise EditorValidationError("Invalid languages")
    cleaned = {"locales": {}, "links": [], "projects": []}
    for lang in ("fa", "en"):
        values = locales.get(lang, {})
        if not isinstance(values, dict) or set(values) - (
            TEXT_FIELDS.keys() | LIST_FIELDS.keys()
        ):
            raise EditorValidationError("Invalid fields")
        cleaned["locales"][lang] = {
            key: text(value, TEXT_FIELDS[key])
            for key, value in values.items()
            if key in TEXT_FIELDS and value != ""
        }
        for key, (count, limit) in LIST_FIELDS.items():
            if key in values:
                if not isinstance(values[key], list) or len(values[key]) > count:
                    raise EditorValidationError("Invalid list length")
                if values[key]:
                    cleaned["locales"][lang][key] = [
                        text(item, limit) for item in values[key]
                    ]
    links = raw.get("links", [])
    if not isinstance(links, list) or len(links) > 5:
        raise EditorValidationError("At most five links")
    for link in links:
        if not isinstance(link, dict):
            raise EditorValidationError("Invalid link")
        url = text(link.get("url"), 500)
        parsed = urlparse(url)
        if (
            parsed.scheme != "https"
            or not parsed.hostname
            or parsed.username
            or parsed.password
        ):
            raise EditorValidationError("Use an HTTPS link")
        cleaned["links"].append({"label": text(link.get("label"), 80), "url": url})
    repos = {repo["name"] for repo in public_card_payload(source)["repos"]}
    projects = raw.get("projects", [])
    if not isinstance(projects, list) or len(projects) > 3:
        raise EditorValidationError("At most three projects")
    seen = set()
    for project in projects:
        if (
            not isinstance(project, dict)
            or project.get("name") not in repos
            or project["name"] in seen
        ):
            raise EditorValidationError("Choose unique public repositories")
        seen.add(project["name"])
        row = {"name": project["name"]}
        for lang in ("fa", "en"):
            values = project.get(lang, {})
            if not isinstance(values, dict):
                raise EditorValidationError("Invalid case study")
            row[lang] = {
                key: text(values.get(key, ""), 600)
                for key in ("problem", "approach", "outcome")
            }
        cleaned["projects"].append(row)
    return cleaned


def projection(user):
    revision = CardRevision.objects.filter(user=user).order_by("-number").first()
    if not revision:
        return {
            "card_schema_version": 1,
            "editor": {"locales": {}, "links": [], "projects": []},
        }
    # Revalidate historical data at the public boundary as well as on write.
    try:
        raw = dict(revision.value)
        available = {r["name"] for r in public_card_payload(user.card)["repos"]}
        raw["projects"] = [
            p
            for p in raw.get("projects", [])
            if isinstance(p, dict) and p.get("name") in available
        ]
        value = clean_editor(raw, user.card)
    except ValueError:
        value = {"locales": {}, "links": [], "projects": []}
    return {"card_schema_version": 1, "editor": value}


def effective_analysis(user, analysis):
    """Merge only public manual fields; never mutate the generated artifact."""
    import copy

    result = copy.deepcopy(public_analysis(analysis) or {"locales": {}})
    overrides = projection(user)["editor"]
    for lang in ("fa", "en"):
        target = result.setdefault("locales", {}).setdefault(lang, {})
        target.update(overrides["locales"].get(lang, {}))
        if overrides["projects"]:
            target["featuredProjects"] = [p["name"] for p in overrides["projects"]]
    return result


@api
def health(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except DatabaseError:
        return JsonResponse({"status": "unavailable"}, status=503)
    return JsonResponse({"status": "ok"})


@api
@csrf_exempt
def editor(request):
    user = session_user(request)
    if not user:
        return json_error("برای ادامه با GitHub وارد شو.", 401)
    if not settings.STUDIO_EDITOR:
        return json_error("Editor temporarily unavailable", 503)
    if request.method == "POST":
        data = payload(request)
        try:
            value = clean_editor(data.get("value", {}), user.card)
        except ValueError as exc:
            return json_error(str(exc))
        with transaction.atomic():
            UserProfile.objects.select_for_update().get(pk=user.pk)
            draft, _ = CardDraft.objects.get_or_create(
                user=user, defaults={"value": projection(user)["editor"]}
            )
            if data.get("version") != draft.version:
                return json_error(
                    "نسخه تغییر کرده؛ صفحه را تازه کن. / Version conflict.", 409
                )
            if data.get("action") == "restore":
                previous = CardRevision.objects.filter(
                    user=user, number=data.get("revision")
                ).first()
                if not previous:
                    return json_error("Revision not found", 404)
                try:
                    value = clean_editor(previous.value, user.card)
                except ValueError:
                    return json_error(
                        "A repository in this revision is no longer public.", 409
                    )
            elif data.get("action") not in ("draft", "apply"):
                return json_error("Invalid action")
            draft.value, draft.version = value, draft.version + 1
            draft.save()
            if data["action"] != "draft":
                head = (
                    CardRevision.objects.filter(user=user).order_by("-number").first()
                )
                CardRevision.objects.create(
                    user=user,
                    number=(head.number if head else 0) + 1,
                    value=value,
                    created=now_ms(),
                    restored_from=data.get("revision")
                    if data["action"] == "restore"
                    else None,
                )
    draft = CardDraft.objects.filter(user=user).first()
    generated = Report.objects.filter(key=f"ai:{user.pk}").first()
    return JsonResponse(
        {
            "version": draft.version if draft else 0,
            "value": draft.value if draft else projection(user)["editor"],
            "generated": public_analysis(generated.value) if generated else None,
            "revisions": list(
                CardRevision.objects.filter(user=user)
                .order_by("-number")
                .values("number", "created", "restored_from")[:50]
            ),
        }
    )


def record_snapshot(user, value):
    if not settings.STUDIO_INSIGHTS:
        return
    day = datetime.now(ZoneInfo(user.timezone)).date()
    ActivitySnapshot.objects.update_or_create(
        user=user,
        period=f"{value['year']}:{value['comparisonYear']}",
        day=day,
        defaults={"value": value, "captured": now_ms()},
    )


@api
def snapshots(request):
    user = session_user(request)
    if not user:
        return json_error("برای ادامه با GitHub وارد شو.", 401)
    if not settings.STUDIO_INSIGHTS:
        return json_error("Insights temporarily unavailable", 503)
    rows = ActivitySnapshot.objects.filter(user=user).order_by("-captured")[:100]
    values = [
        {
            "id": row.pk,
            "day": str(row.day),
            "period": row.period,
            "captured": row.captured,
            "current": row.value["current"],
        }
        for row in rows
    ]
    if request.GET.get("format") == "csv":
        stream = io.StringIO()
        writer = csv.writer(stream)
        writer.writerow(
            [
                "captured_at",
                "period",
                "captured_day",
                "period_contributions",
                "period_commits",
                "period_pull_requests",
                "period_reviews",
                "period_issues",
            ]
        )

        def cell(value):
            value = str(value)
            return (
                "'" + value
                if value.startswith(("=", "+", "-", "@", "\t", "\r"))
                else value
            )

        for row in values:
            total = sum(day.get("count", 0) for day in row["current"].get("days", []))
            writer.writerow(
                [
                    cell(v)
                    for v in [
                        row["captured"],
                        row["period"],
                        row["day"],
                        total,
                        *[
                            row["current"].get(k, 0)
                            for k in ("commits", "pullRequests", "reviews", "issues")
                        ],
                    ]
                ]
            )
        response = HttpResponse(
            "\ufeff" + stream.getvalue(), content_type="text/csv; charset=utf-8"
        )
        response["Content-Disposition"] = (
            'attachment; filename="activity-snapshots.csv"'
        )
        return response
    return JsonResponse({"snapshots": values})


@api
@csrf_exempt
def goal(request):
    user = session_user(request)
    if not user:
        return json_error("برای ادامه با GitHub وارد شو.", 401)
    if not settings.STUDIO_INSIGHTS:
        return json_error("Insights temporarily unavailable", 503)
    today = datetime.now(ZoneInfo(user.timezone)).date()
    week = today - timedelta(days=today.weekday())
    if request.method == "POST":
        minutes = payload(request).get("minutes")
        if type(minutes) is not int or not 1 <= minutes <= 10080:
            return json_error("هدف باید بین ۱ و ۱۰۰۸۰ دقیقه باشد.")
        WeeklyGoal.objects.update_or_create(
            user=user, week=week, defaults={"minutes": minutes}
        )
    row = WeeklyGoal.objects.filter(user=user, week=week).first()
    daily = time_data(user)["daily"]
    completed = (
        sum(value for day, value in daily.items() if str(week) <= day <= str(today))
        / 60000
    )
    return JsonResponse(
        {
            "week": str(week),
            "minutes": row.minutes if row else None,
            "completed": completed,
        }
    )
