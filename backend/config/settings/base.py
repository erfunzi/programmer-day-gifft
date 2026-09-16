import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR.parent / ".env", override=False)
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY") or os.getenv("SESSION_SECRET")
if not SECRET_KEY:
    raise ImproperlyConfigured("Set DJANGO_SECRET_KEY in the root .env.")
DEBUG = False
ALLOWED_HOSTS = os.getenv(
    "DJANGO_ALLOWED_HOSTS", "developer.lyroo.space,localhost,127.0.0.1,backend"
).split(",")
ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"
INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.sessions",
    "workspace",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "workspace.middleware.AdminErrorNotifyMiddleware",
]
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "developer_card"),
        "USER": os.getenv("POSTGRES_USER", "developer_card"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", ""),
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": 60,
    }
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
TIME_ZONE = os.getenv("TIME_ZONE", "UTC")
APP_ORIGIN = os.getenv("APP_ORIGIN", "https://developer.lyroo.space").rstrip("/")
SESSION_COOKIE_SECURE = APP_ORIGIN.startswith("https://")
SESSION_COOKIE_SAMESITE = "Lax"
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/1")
CELERY_TIMEZONE = TIME_ZONE
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True

# Match the reverse proxies; individual card images remain limited to 10 MiB.
DATA_UPLOAD_MAX_MEMORY_SIZE = 12 * 1024 * 1024
