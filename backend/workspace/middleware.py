import traceback

from django.utils.deprecation import MiddlewareMixin


class AdminErrorNotifyMiddleware(MiddlewareMixin):
    """Send unhandled backend exceptions to the Telegram admin chat."""

    def process_exception(self, request, exception):
        try:
            from workspace.telegram import notify_admin

            path = getattr(request, "path", "")
            method = getattr(request, "method", "")
            notify_admin(
                "Backend error",
                traceback.format_exc(limit=20),
                context=f"{method} {path} :: {exception.__class__.__name__}: {exception}",
            )
        except Exception:
            # Never let alert delivery break the real error response.
            pass
        return None
