from django.conf import settings
from django.db import connection
import redis
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(auth=[], responses={200: dict, 503: dict})
    def get(self, request):
        database_ok = True

        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception:
            database_ok = False

        status_code = 200 if database_ok else 503
        return Response(
            {
                "status": "ok" if database_ok else "degraded",
                "database": database_ok,
            },
            status=status_code,
        )


class QueueHealthView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(auth=[], responses={200: dict, 503: dict})
    def get(self, request):
        try:
            client = redis.Redis.from_url(settings.CELERY_BROKER_URL)
            client.ping()
            queue_backlog = client.llen("celery")
        except Exception as exc:
            return Response(
                {
                    "status": "degraded",
                    "broker": False,
                    "error": str(exc),
                },
                status=503,
            )

        return Response(
            {
                "status": "ok",
                "broker": True,
                "queue_backlog": queue_backlog,
            }
        )
