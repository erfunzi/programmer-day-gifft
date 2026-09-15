from .base import *

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
APP_ORIGIN = "http://testserver"
ALLOWED_HOSTS = ["testserver"]
SESSION_COOKIE_SECURE = False
