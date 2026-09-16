from django.urls import path
from workspace import views

urlpatterns = [
    path("api/config", views.config),
    path("api/me", views.me),
    path("api/me/profile", views.profile),
    path("api/me/activity", views.activity),
    path("api/me/time", views.time),
    path("api/me/time/start", views.time_start),
    path("api/me/time/stop", views.time_stop),
    path("api/me/timezone", views.timezone),
    path("api/me/share", views.share),
    path("api/me/telegram", views.telegram_status),
    path("api/me/telegram/link", views.telegram_link),
    path("api/me/telegram/publish", views.telegram_publish),
    path("api/me/ai", views.ai),
    path("api/me/introduction", views.introduction),
    path("api/me/image", views.image),
    path("api/cards/<str:login>", views.card),
    path("api/cards/<str:login>/image", views.card_image),
    path("auth/github", views.github_login),
    path("auth/github/callback", views.github_callback),
    path("auth/logout", views.logout),
    path("telegram/webhook", views.telegram_webhook),
]
