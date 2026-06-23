from __future__ import annotations

from typing import Any

from django.contrib.auth.models import AnonymousUser
from django.http import HttpRequest

from apps.chats.models import AuditLog


def get_client_ip(request: HttpRequest | None) -> str | None:
    if request is None:
        return None

    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()

    return request.META.get("REMOTE_ADDR")


def log_audit_event(
    *,
    action: str,
    request: HttpRequest | None = None,
    actor=None,
    target_type: str = "",
    target_id: str = "",
    metadata: dict[str, Any] | None = None,
) -> AuditLog:
    if actor is None and request is not None:
        actor = getattr(request, "user", None)

    if isinstance(actor, AnonymousUser):
        actor = None

    return AuditLog.objects.create(
        actor=actor,
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id else "",
        metadata=metadata or {},
        ip_address=get_client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "") if request else "",
    )
