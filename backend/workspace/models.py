from django.db import models


class UserProfile(models.Model):
    theme = models.CharField(max_length=40, default="aurora-mint")
    language = models.CharField(max_length=2, default="fa")
    id = models.BigIntegerField(primary_key=True)
    login = models.CharField(max_length=39, unique=True)
    name = models.CharField(max_length=255, blank=True)
    avatar = models.URLField(blank=True)
    timezone = models.CharField(max_length=80, default="Asia/Tehran")
    joined = models.BigIntegerField()
    access_token = models.TextField(blank=True)
    card = models.JSONField(null=True, blank=True)
    published = models.BooleanField(default=False)


class UserSession(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    token = models.TextField()
    expires = models.BigIntegerField()


class OAuthState(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    verifier = models.TextField()
    expires = models.BigIntegerField()


class WorkSession(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    started = models.BigIntegerField()
    ended = models.BigIntegerField(null=True, blank=True)
    project = models.CharField(max_length=100, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=models.Q(ended__isnull=True),
                name="one_active_work_session",
            )
        ]


class Report(models.Model):
    key = models.CharField(max_length=255, primary_key=True)
    value = models.JSONField()
    saved = models.BigIntegerField()


class GeneratedImage(models.Model):
    user = models.OneToOneField(UserProfile, primary_key=True, on_delete=models.CASCADE)
    mime_type = models.CharField(max_length=100)
    body = models.BinaryField()


class TelegramLink(models.Model):
    token = models.CharField(max_length=96, primary_key=True)
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    telegram_id = models.BigIntegerField(null=True, blank=True, unique=True)
    username = models.CharField(max_length=255, blank=True)
    expires = models.BigIntegerField()


class TelegramPublication(models.Model):
    deleted = models.BooleanField(default=False)
    membership_checked = models.BooleanField(default=False)
    user = models.OneToOneField(UserProfile, primary_key=True, on_delete=models.CASCADE)
    chat_id = models.CharField(max_length=255)
    message_id = models.BigIntegerField()
    telegram_id = models.BigIntegerField(null=True, blank=True)
    theme = models.CharField(max_length=40, default="aurora-mint")
    created = models.BigIntegerField()


class CardRevision(models.Model):
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    number = models.PositiveIntegerField()
    value = models.JSONField(default=dict)
    created = models.BigIntegerField()
    restored_from = models.PositiveIntegerField(null=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['user', 'number'], name='card_revision_number')]


class CardDraft(models.Model):
    user = models.OneToOneField(UserProfile, on_delete=models.CASCADE, primary_key=True)
    value = models.JSONField(default=dict)
    version = models.PositiveIntegerField(default=0)


class ActivitySnapshot(models.Model):
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    period = models.CharField(max_length=30)
    day = models.DateField()
    value = models.JSONField()
    captured = models.BigIntegerField()

    class Meta:
        constraints = [models.UniqueConstraint(fields=['user', 'period', 'day'], name='daily_activity_snapshot')]


class WeeklyGoal(models.Model):
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    week = models.DateField()
    minutes = models.PositiveIntegerField()

    class Meta:
        constraints = [models.UniqueConstraint(fields=['user', 'week'], name='one_weekly_goal')]


class BackgroundJob(models.Model):
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    kind = models.CharField(max_length=20)
    state = models.CharField(max_length=20, default='pending')
    created = models.BigIntegerField()
    updated = models.BigIntegerField()
    error = models.CharField(max_length=100, blank=True)
    data = models.JSONField(default=dict)
    image = models.BinaryField(null=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['user', 'kind'], condition=models.Q(state__in=['pending', 'running', 'unknown']), name='one_active_background_job')]


class OutboxEvent(models.Model):
    job = models.OneToOneField(BackgroundJob, on_delete=models.CASCADE)
    dispatched = models.BigIntegerField(null=True)


class JobAudit(models.Model):
    job = models.ForeignKey(BackgroundJob, on_delete=models.CASCADE)
    created = models.BigIntegerField()
    actor = models.CharField(max_length=150)
    note = models.TextField()
