from celery import shared_task

from .jobs import recover_stale, run_job
from .models import OutboxEvent
from .views import now_ms


@shared_task(ignore_result=True, soft_time_limit=900, time_limit=960)
def execute_job(job_id):
    run_job(job_id)


@shared_task(ignore_result=True)
def dispatch_outbox():
    recover_stale()
    # Re-dispatch pending rows if broker delivery was lost. Claiming is in DB.
    for event in OutboxEvent.objects.filter(job__state="pending").order_by("pk")[:100]:
        if event.dispatched and now_ms() - event.dispatched < 60000:
            continue
        execute_job.delay(event.job_id)
        event.dispatched = now_ms()
        event.save(update_fields=["dispatched"])
