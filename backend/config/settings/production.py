from urllib.parse import urlsplit

from .base import *

DEBUG = False
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
X_FRAME_OPTIONS = "DENY"
origin = urlsplit(APP_ORIGIN)
if origin.scheme != "https" or not origin.netloc or origin.path or origin.query or origin.fragment:
    raise ImproperlyConfigured('Production APP_ORIGIN must be an HTTPS origin, e.g. https://developer.lyroo.space')
if not DATABASES['default']['PASSWORD'] or DATABASES['default']['PASSWORD'].startswith('replace-with-'):
    raise ImproperlyConfigured('Set a real POSTGRES_PASSWORD in the shared .env.')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_TRUSTED_ORIGINS = [APP_ORIGIN]
