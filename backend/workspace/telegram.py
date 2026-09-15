import html
import os
import re

import requests
from django.conf import settings

from .models import TelegramLink, TelegramPublication
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
    response.raise_for_status()
    body = response.json()
    if not body.get("ok"):
        raise RuntimeError(body.get("description", "Telegram API failed"))
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


def render_caption(profile, theme):
    user = profile["user"]
    repos = profile.get("repos", [])
    top = sorted(repos, key=lambda item: item.get("stargazers_count", 0), reverse=True)[:3]
    rows = [
        f"<code>projects   {int(user.get('public_repos', 0)):,}</code>",
        f"<code>followers  {int(user.get('followers', 0)):,}</code>",
        f"<code>stars      {sum(int(repo.get('stargazers_count', 0)) for repo in repos):,}</code>",
    ]
    projects = "\n".join(
        f"{premium_emoji('badge_alt')} <a href=\"https://github.com/{esc(user['login'])}/{esc(repo['name'])}\">{esc(repo['name'])}</a> · {premium_emoji('sparkle')} {int(repo.get('stargazers_count', 0)):,}"
        for repo in top
    ) or f"{premium_emoji('badge_alt')} هنوز پروژهٔ عمومی برای نمایش پیدا نشد"
    app_url = f"{settings.APP_ORIGIN}/?u={esc(user['login'])}&theme={esc(theme)}"
    return (
        f"{premium_emoji('sparkle')} <b>یک سازندهٔ تازه در lyrooDev</b>\n\n"
        f"{premium_emoji('person')} <b>{esc(user.get('name') or user['login'])}</b> · <code>@{esc(user['login'])}</code>\n"
        f"{premium_emoji('badge')} تم کارت: <i>{esc(theme)}</i>\n\n"
        f"<blockquote>هر commit یک قدم است؛ این کارت، خلاصه‌ای از مسیر ساختن، ابزارها و پروژه‌های عمومی این توسعه‌دهنده است.</blockquote>\n\n"
        f"<pre>╭──────── developer stats ────────╮\n"
        + "\n".join(rows)
        + "\n╰────────────────────────────────╯</pre>\n\n"
        f"{premium_emoji('note')} <b>پروژه‌های شاخص</b>\n{projects}\n\n"
        f"{premium_emoji('next')} <a href=\"{app_url}\">کارت کامل را ببین و برای دوستت بفرست</a>\n"
        f"#developer_card #lyrooDev"
    )


def publish(user, theme="aurora-mint", refresh=False, card_image=None):
    if not configured():
        return None
    if os.getenv("TELEGRAM_REQUIRE_JOIN", "false").lower() == "true":
        link = TelegramLink.objects.filter(user=user, telegram_id__isnull=False).first()
        if not link or member_status(link.telegram_id) not in {"creator", "administrator", "member", "restricted"}:
            return None
    existing = TelegramPublication.objects.filter(user=user).first()
    if existing and not refresh:
        return {"message_id": existing.message_id, "chat": {"id": existing.chat_id}}
    if existing and refresh:
        delete_publication(user)
    profile = profile_data(user)
    link = TelegramLink.objects.filter(user=user, telegram_id__isnull=False).first()
    caption = render_caption(profile, theme)
    markup = {
        "inline_keyboard": [
            [{"text": "➡️  مشاهدهٔ کارت کامل", "url": f"{settings.APP_ORIGIN}/?u={user.login}&theme={theme}"}],
        ]
    }
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
        },
    )
    return result


def delete_publication(user):
    publication = TelegramPublication.objects.filter(user=user).first()
    if not publication or not configured():
        return False
    try:
        api_call("deleteMessage", {"chat_id": publication.chat_id, "message_id": publication.message_id})
    except (requests.RequestException, RuntimeError):
        pass
    publication.delete()
    return True


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
        if publication:
            delete_publication(publication.user)
