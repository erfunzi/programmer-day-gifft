import json
import html
import os
import re

import requests
from django.conf import settings
from django.db import transaction

from .models import TelegramLink, TelegramPublication, UserProfile
from .views import now_ms, profile_data, token


API = "https://api.telegram.org/bot{}"

PREMIUM_EMOJIS = {
    "sparkle": ("5325547803936572038", "✨"),
    "fire": ("5220166546491459639", "🔥"),
    "badge": ("5030598011579794041", "🔰"),
    "badge_alt": ("5033242607627535090", "🔰"),
    "note": ("5033080906403808074", "📝"),
    "lock": ("5030643469513655027", "🔒"),
    "image": ("5033108527338488459", "🖼"),
    "phone": ("5032882092367675986", "📞"),
    "phone_alt": ("4969971262546772590", "📞"),
    "calendar": ("5030732809128379408", "🗓"),
    "back": ("4972453139463537420", "⬅️"),
    "next": ("4969851488793788974", "➡️"),
    "previous": ("4970176665062736422", "◀️"),
    "heart": ("4970032714938843839", "❤️"),
    "home": ("4970038633403777664", "🏠"),
    "announce": ("4967835134792303324", "📢"),
    "announce_alt": ("4967957395331351254", "📢"),
    "person": ("4967667085606912536", "👤"),
    "bookmark": ("4967853603151676186", "🔖"),
    "settings": ("4965290516993278759", "⚙️"),
    "download": ("4965313018326942268", "⬇️"),
    "cart": ("4967523779728114410", "🛒"),
}


def configured():
    return bool(os.getenv("TELEGRAM_BOT_TOKEN") and os.getenv("TELEGRAM_CHANNEL_ID"))


def bot_token():
    return os.getenv("TELEGRAM_BOT_TOKEN", "")


def admin_id():
    raw = os.getenv("TELEGRAM_ADMIN_ID", "").strip()
    return int(raw) if raw.isdigit() else None


def channel_id():
    return os.getenv("TELEGRAM_CHANNEL_ID", "@lyrooDev")


def channel_url():
    return os.getenv("TELEGRAM_CHANNEL_URL", "https://t.me/lyrooDev")


def bot_username():
    return os.getenv("TELEGRAM_BOT_USERNAME", "")


def bot_call(method, data=None, files=None, timeout=25):
    token = bot_token()
    if not token:
        raise RuntimeError("Telegram bot token is not configured")
    response = requests.post(
        API.format(token) + "/" + method,
        data=data,
        files=files,
        timeout=timeout,
    )
    body = response.json()
    if not body.get("ok"):
        raise TelegramAPIError(body.get("description", "Telegram API failed"))
    response.raise_for_status()
    return body.get("result")


def api_call(method, data=None, files=None, timeout=25):
    if not configured():
        raise RuntimeError("Telegram is not configured")
    return bot_call(method, data=data, files=files, timeout=timeout)


def notify_admin(title, detail="", context=None):
    """Best-effort alert to the configured Telegram admin chat."""
    chat_id = admin_id()
    if not chat_id or not bot_token():
        return False
    parts = [f"{premium_emoji('fire')} <b>{esc(title)}</b>"]
    if detail:
        parts.append(f"<pre>{esc(str(detail)[:3500])}</pre>")
    if context:
        parts.append(f"<code>{esc(str(context)[:800])}</code>")
    try:
        bot_call(
            "sendMessage",
            {
                "chat_id": chat_id,
                "text": "\n\n".join(parts),
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            },
            timeout=10,
        )
        return True
    except (requests.RequestException, RuntimeError, ValueError):
        return False


def set_bot_commands():
    token = bot_token()
    if not token:
        raise RuntimeError("Telegram bot token is not configured")
    response = requests.post(
        API.format(token) + "/setMyCommands",
        json={
            "commands": [
                {"command": "start", "description": "شروع و راهنمای ربات"},
                {"command": "help", "description": "راهنمای اتصال کارت به کانال"},
            ]
        },
        timeout=20,
    )
    response.raise_for_status()
    body = response.json()
    if not body.get("ok"):
        raise RuntimeError(body.get("description", "setMyCommands failed"))
    return body.get("result")


def welcome_text():
    site = settings.APP_ORIGIN
    return (
        f"{premium_emoji('sparkle')} <b>سلام! به ربات Developer Card خوش آمدی.</b>\n\n"
        f"با این ربات می‌توانی کارتت را به کانال <a href=\"{esc(channel_url())}\">lyrooDev</a> وصل کنی.\n\n"
        f"{premium_emoji('next')} <b>مسیر کار:</b>\n"
        f"۱. وارد سایت شو: <a href=\"{esc(site)}\">{esc(site)}</a>\n"
        f"۲. با GitHub لاگین کن و کارت خودت را بساز\n"
        f"۳. از داخل سایت، اتصال تلگرام را بزن\n"
        f"۴. عضو کانال بمان تا کارت در کانال باقی بماند\n\n"
        f"{premium_emoji('note')} اگر لینک اتصال از سایت آمد، همان را باز کن یا /start را با پارامتر لینک بزن."
    )


def esc(value):
    return html.escape(str(value or ""), quote=False)


def premium_emoji(name):
    emoji_id, fallback = PREMIUM_EMOJIS[name]
    return f'<tg-emoji emoji-id="{emoji_id}">{fallback}</tg-emoji>'


def render_caption(profile, theme, analysis=None):
    # Telegram measures caption length in UTF-16 units, including emoji pairs.
    def short(value, limit):
        return str(value).encode('utf-16-le')[:limit * 2].decode('utf-16-le', errors='ignore')
    user = profile["user"]
    narrative = (analysis or {}).get("locales", {}).get("fa", {})
    repos = [r for r in profile.get("repos", []) if r.get("name") and not r.get("fork") and not r.get("private") and r["name"].lower() != user["login"].lower()]
    by_name = {r["name"]: r for r in repos}
    top = []
    for name in narrative.get("featuredProjects", []):
        if name in by_name and by_name[name] not in top:
            top.append(by_name[name])
    for repo in sorted(repos, key=lambda item: item.get("stargazers_count", 0), reverse=True):
        if repo not in top:
            top.append(repo)
    top = top[:3]
    projects = "\n".join(
        f"• <a href=\"https://github.com/{esc(user['login'])}/{esc(repo['name'])}\">{esc(short(repo['name'], 70))}</a>"
        for repo in top
    ) or "هنوز پروژهٔ عمومی برای نمایش پیدا نشد"
    message = narrative.get("telegramText") or narrative.get("summary") or "پروژه‌ها و مسیر ساختن این توسعه‌دهنده را در کارت او ببینید."
    return (
        f"<b>{esc(short(user.get('name') or user['login'], 80))}</b> · <code>@{esc(user['login'])}</code>\n\n"
        f"{esc(short(message, 420))}\n\n"
        f"<b>پروژه‌های شاخص</b>\n{projects}\n\n"
        f"#developer_card #lyrooDev"
    )


def profile_for_caption(user):
    """Build caption data without requiring a live GitHub token."""
    from .models import Report

    cached = Report.objects.filter(key=f"profile:{user.id}").first()
    if cached and isinstance(cached.value, dict) and cached.value.get("user"):
        return cached.value
    if isinstance(user.card, dict) and user.card.get("user"):
        return {"user": user.card["user"], "repos": user.card.get("repos") or []}
    try:
        return profile_data(user)
    except Exception:
        return {
            "user": {
                "login": user.login,
                "name": user.name or user.login,
                "public_repos": 0,
                "followers": 0,
                "avatar_url": user.avatar,
            },
            "repos": [],
        }


WEEK = 7 * 86400000
GRACE = 2 * 3600000
MEMBERS = {"creator", "administrator", "member", "restricted"}

class TelegramAPIError(RuntimeError):
    pass

class PublicationUnavailable(RuntimeError):
    pass


def publication_markup(user, theme):
    return {"inline_keyboard": [[{"text": "➡️  باز کردن کارت در سایت", "url": f"{settings.APP_ORIGIN}/?u={user.login}&theme={theme}&lang={user.language}"}]]}


def message_present(publication):
    if publication.deleted:
        return False
    try:
        api_call("editMessageReplyMarkup", {
            "chat_id": publication.chat_id, "message_id": publication.message_id,
            "reply_markup": json.dumps(publication_markup(publication.user, publication.theme)),
        })
    except TelegramAPIError as exc:
        description = str(exc).lower()
        if "message is not modified" in description:
            return True
        if "message to edit not found" in description or "message not found" in description:
            publication.deleted = True
            publication.save(update_fields=["deleted"])
            return False
        raise
    return True


@transaction.atomic
def publication_state(user):
    UserProfile.objects.select_for_update().get(pk=user.pk)
    existing = TelegramPublication.objects.filter(user=user).first()
    if not existing:
        return {"initialPublish": True, "canPublish": True, "nextPublishAt": None, "messagePresent": False}
    due = existing.created + WEEK
    present = not existing.deleted
    if due <= now_ms() and present:
        # Fail closed when Telegram cannot confirm whether the old post exists.
        try:
            present = message_present(existing)
        except (requests.RequestException, RuntimeError, ValueError):
            present = True
    return {"initialPublish": False, "canPublish": due <= now_ms() and not present, "nextPublishAt": due, "messagePresent": present}


@transaction.atomic
def publish(user, theme="aurora-mint", refresh=False, card_image=None):
    if not configured():
        raise RuntimeError("Telegram is not configured")
    UserProfile.objects.select_for_update().get(pk=user.pk)
    existing = TelegramPublication.objects.filter(user=user).first()
    if existing:
        if not refresh:
            return {"message_id": existing.message_id, "created": False}
        if now_ms() < existing.created + WEEK:
            raise PublicationUnavailable("انتشار مجدد پس از گذشت ۷ روز از آخرین انتشار امکان‌پذیر است.")
        if message_present(existing):
            raise PublicationUnavailable("کارتت هنوز در کانال موجود است؛ انتشار دوباره لازم نیست.")
    profile = profile_for_caption(user)
    link = TelegramLink.objects.filter(user=user, telegram_id__isnull=False).first()
    from .models import Report
    analysis = Report.objects.filter(key=f"ai:{user.id}").first()
    caption = render_caption(profile, theme, analysis.value if analysis else None)
    markup = publication_markup(user, theme)
    data = {
        "chat_id": channel_id(),
        "caption": caption,
        "parse_mode": "HTML",
        "reply_markup": __import__("json").dumps(markup),
    }
    if not card_image:
        raise RuntimeError("The final rendered card image is required")
    raw, mime = card_image
    result = api_call(
        "sendPhoto",
        data=data,
        files={"photo": (f"developer-card-{user.login}.png", raw, mime)},
    )
    TelegramPublication.objects.update_or_create(
        user=user,
        defaults={
            "chat_id": str(channel_id()),
            "message_id": result["message_id"],
            "telegram_id": link.telegram_id if link else None,
            "theme": theme,
            "created": now_ms(),
            "deleted": False,
            "membership_checked": False,
        },
    )
    return {**result, "created": True}


@transaction.atomic
def delete_publication(user):
    UserProfile.objects.select_for_update().get(pk=user.pk)
    publication = TelegramPublication.objects.filter(user=user, deleted=False).first()
    if not publication or not configured():
        return False
    try:
        api_call("deleteMessage", {"chat_id": publication.chat_id, "message_id": publication.message_id})
    except TelegramAPIError as exc:
        if "message to delete not found" not in str(exc).lower():
            return False
    except (requests.RequestException, RuntimeError, ValueError):
        return False
    publication.deleted = True
    publication.save(update_fields=["deleted"])
    return True


def enforce_membership_deadlines():
    for user_id in TelegramPublication.objects.filter(deleted=False, membership_checked=False, created__lte=now_ms()-GRACE).values_list("user_id", flat=True):
        with transaction.atomic():
            user = UserProfile.objects.select_for_update().get(pk=user_id)
            publication = TelegramPublication.objects.get(user=user)
            if publication.deleted or publication.membership_checked or publication.created > now_ms()-GRACE:
                continue
            link = TelegramLink.objects.filter(user=user, telegram_id__isnull=False).first()
            status = member_status(link.telegram_id) if link else "left"
            if status in MEMBERS:
                publication.membership_checked = True
                publication.save(update_fields=["membership_checked"])
            elif status == "left":
                delete_publication(user)
            # Unknown membership is retried; outages are not treated as non-membership.


def member_status(telegram_id):
    if not configured() or not telegram_id:
        return None
    try:
        member = api_call("getChatMember", {"chat_id": channel_id(), "user_id": telegram_id})
    except (requests.RequestException, RuntimeError):
        return None
    status = member.get("status")
    return status if status in {"creator", "administrator", "member", "restricted"} and (status != "restricted" or member.get("is_member")) else "left"


def create_link(user):
    if not configured() or not bot_username():
        return None
    link_token = token()
    TelegramLink.objects.filter(user=user).delete()
    TelegramLink.objects.create(token=link_token, user=user, expires=now_ms() + 900000)
    return f"https://t.me/{bot_username()}?start=link_{link_token}"


def handle_update(update):
    message = update.get("message") or {}
    text = (message.get("text") or "").strip()
    chat = message.get("chat") or {}
    sender = message.get("from") or {}
    if chat.get("type") == "private" and text:
        start_match = re.fullmatch(r"/(?:start|help)(?:@[^ ]+)?(?:\s+(\S+))?", text)
        if start_match:
            payload = start_match.group(1) or ""
            link_match = re.fullmatch(r"link_([A-Za-z0-9_-]+)", payload)
            if link_match:
                link = (
                    TelegramLink.objects.filter(token=link_match.group(1), expires__gt=now_ms())
                    .select_related("user")
                    .first()
                )
                if link:
                    link.telegram_id = sender.get("id")
                    link.username = sender.get("username", "")
                    link.save(update_fields=["telegram_id", "username"])
                    user = link.user
                    publication = TelegramPublication.objects.filter(user=user).first()
                    if publication:
                        publication.telegram_id = link.telegram_id
                        publication.save(update_fields=["telegram_id"])
                    api_call(
                        "sendMessage",
                        {
                            "chat_id": chat["id"],
                            "text": (
                                f"{premium_emoji('sparkle')} اتصال <code>@{esc(user.login)}</code> انجام شد.\n"
                                f"حالا در <a href=\"{esc(channel_url())}\">{esc(channel_url())}</a> عضو بمان "
                                f"تا کارتت در کانال باقی بماند."
                            ),
                            "parse_mode": "HTML",
                            "disable_web_page_preview": True,
                        },
                    )
                else:
                    bot_call(
                        "sendMessage",
                        {
                            "chat_id": chat["id"],
                            "text": "لینک اتصال نامعتبر یا منقضی است. از داخل سایت دوباره اتصال تلگرام را بزن.",
                        },
                    )
                return
            bot_call(
                "sendMessage",
                {
                    "chat_id": chat["id"],
                    "text": welcome_text(),
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                    "reply_markup": __import__("json").dumps(
                        {
                            "inline_keyboard": [
                                [{"text": "ساخت کارت در سایت ↗", "url": settings.APP_ORIGIN}],
                                [{"text": "کانال lyrooDev", "url": channel_url()}],
                            ]
                        }
                    ),
                },
            )
            return
    changed = update.get("chat_member") or {}
    changed_chat = changed.get("chat", {})
    expected_chat = str(channel_id())
    matches_chat = str(changed_chat.get("id")) == expected_chat or (
        expected_chat.startswith("@")
        and changed_chat.get("username", "").lower() == expected_chat[1:].lower()
    )
    if not matches_chat:
        return
    new_status = changed.get("new_chat_member", {}).get("status")
    if new_status in {"left", "kicked"}:
        telegram_id = changed.get("new_chat_member", {}).get("user", {}).get("id")
        publication = TelegramPublication.objects.filter(telegram_id=telegram_id).select_related("user").first()
        if publication and publication.created + GRACE <= now_ms():
            delete_publication(publication.user)
