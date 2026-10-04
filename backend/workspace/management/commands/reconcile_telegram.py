from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from workspace.models import BackgroundJob, JobAudit, TelegramLink, TelegramPublication
from workspace.telegram import channel_id
from workspace.views import now_ms


class Command(BaseCommand):
    help = "Reconcile an UNKNOWN Telegram attempt after manually checking the channel."

    def add_arguments(self, parser):
        parser.add_argument("job", type=int)
        parser.add_argument("--actor", required=True)
        parser.add_argument("--note", required=True)
        result = parser.add_mutually_exclusive_group(required=True)
        result.add_argument("--message-id", type=int)
        result.add_argument("--confirmed-absent", action="store_true")
        parser.add_argument(
            "--published-at",
            type=int,
            help="Confirmed publication timestamp in Unix milliseconds (required with message-id)",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        job = BackgroundJob.objects.select_for_update().get(
            pk=options["job"], kind="telegram"
        )
        if job.state != "unknown":
            raise CommandError("Only UNKNOWN attempts can be reconciled")
        if options["message_id"]:
            if options["message_id"] <= 0:
                raise CommandError("A positive message ID is required")
            published_at = options["published_at"]
            if not published_at or not job.created <= published_at <= now_ms():
                raise CommandError(
                    "Provide the verified --published-at timestamp between job creation and now"
                )
            link = TelegramLink.objects.filter(
                user=job.user, telegram_id__isnull=False
            ).first()
            TelegramPublication.objects.update_or_create(
                user=job.user,
                defaults={
                    "message_id": options["message_id"],
                    "chat_id": channel_id(),
                    "theme": job.data["theme"],
                    "created": published_at,
                    "deleted": False,
                    "membership_checked": False,
                    "telegram_id": link.telegram_id if link else None,
                },
            )
            job.state = "succeeded"
        else:
            job.state = "failed"
        job.error, job.updated = "", now_ms()
        job.save(update_fields=["state", "error", "updated"])
        JobAudit.objects.create(
            job=job, created=now_ms(), actor=options["actor"], note=options["note"]
        )
        self.stdout.write(job.state)
