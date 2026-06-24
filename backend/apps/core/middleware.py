import logging
import time
from uuid import uuid4


logger = logging.getLogger("apps.core.requests")


class RequestLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        started = time.perf_counter()
        request_id = request.headers.get("x-request-id") or str(uuid4())
        request.request_id = request_id

        try:
            response = self.get_response(request)
        except Exception:
            logger.exception(
                "request.failed",
                extra=self._extra(request, request_id, 500, started),
            )
            raise

        response["X-Request-ID"] = request_id
        logger.info(
            "request.completed",
            extra=self._extra(request, request_id, response.status_code, started),
        )
        return response

    def _extra(self, request, request_id, status_code, started):
        user = getattr(request, "user", None)
        return {
            "request_id": request_id,
            "method": request.method,
            "path": request.path,
            "status_code": status_code,
            "duration_ms": round((time.perf_counter() - started) * 1000, 2),
            "user_id": str(user.id) if getattr(user, "is_authenticated", False) else "",
        }
