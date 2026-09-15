from .base import *

DEBUG = True
APP_ORIGIN = os.getenv("DEV_APP_ORIGIN", "http://localhost:8080").rstrip("/")
SESSION_COOKIE_SECURE = APP_ORIGIN.startswith("https://")
