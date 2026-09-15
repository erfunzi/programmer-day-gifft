from django.db import models


class UserProfile(models.Model):
    id = models.BigIntegerField(primary_key=True)
    login = models.CharField(max_length=39, unique=True)
    name = models.CharField(max_length=255, blank=True)
    avatar = models.URLField(blank=True)
    timezone = models.CharField(max_length=80, default="UTC")
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
