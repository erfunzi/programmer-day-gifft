import time
from django.core.management.base import BaseCommand
from django.db import close_old_connections
from workspace.telegram import enforce_membership_deadlines

class Command(BaseCommand):
    help = "Remove unjoined Telegram cards after their two-hour grace period"

    def add_arguments(self, parser):
        parser.add_argument("--loop", action="store_true")

    def handle(self, *args, **options):
        while True:
            close_old_connections()
            enforce_membership_deadlines()
            if not options["loop"]:
                return
            time.sleep(60)
