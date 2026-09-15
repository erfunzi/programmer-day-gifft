import os

import requests
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Register the Telegram webhook for channel membership updates."

    def handle(self, *args, **options):
        token = os.getenv("TELEGRAM_BOT_TOKEN")
        secret = os.getenv("TELEGRAM_WEBHOOK_SECRET")
        if not token or not secret:
            raise CommandError("Set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET first.")
        response = requests.post(
            f"https://api.telegram.org/bot{token}/setWebhook",
            json={
                "url": f"{settings.APP_ORIGIN}/telegram/webhook",
                "secret_token": secret,
                "allowed_updates": ["message", "chat_member"],
                "drop_pending_updates": False,
            },
            timeout=20,
        )
        response.raise_for_status()
        payload = response.json()
        if not payload.get("ok"):
            raise CommandError(payload.get("description", "Telegram rejected the webhook."))
        self.stdout.write(self.style.SUCCESS("Telegram webhook registered."))
