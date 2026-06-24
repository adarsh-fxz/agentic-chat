from celery import shared_task
from django.conf import settings
from django.utils import timezone

from apps.chats.models import AssistantRun, ToolCall
from apps.chats.services.tools import ToolTimeoutError, execute_tool


@shared_task(bind=True, autoretry_for=(ToolTimeoutError,), max_retries=1, retry_backoff=True)
def execute_tool_call_task(self, tool_call_id: str) -> dict:
    tool_call = ToolCall.objects.get(id=tool_call_id)

    if tool_call.status == ToolCall.Status.COMPLETED:
        return {
            "status": tool_call.status,
            "result": tool_call.result,
            "error": tool_call.error,
            "duration_ms": tool_call.duration_ms,
        }

    tool_call.status = ToolCall.Status.RUNNING
    tool_call.started_at = tool_call.started_at or timezone.now()
    tool_call.save(update_fields=["status", "started_at", "updated_at"])

    try:
        result, error, duration_ms = execute_tool(tool_call.name, tool_call.arguments)
        tool_call.status = ToolCall.Status.COMPLETED
        tool_call.result = result
        tool_call.error = error
        tool_call.duration_ms = duration_ms
    except ToolTimeoutError:
        tool_call.status = ToolCall.Status.TIMED_OUT
        tool_call.error = f"Tool timed out after {settings.AGENT_TOOL_TIMEOUT_SECONDS} seconds."
        raise
    except Exception as exc:
        tool_call.status = ToolCall.Status.FAILED
        tool_call.error = str(exc)
    finally:
        tool_call.completed_at = timezone.now()
        tool_call.save(
            update_fields=[
                "status",
                "result",
                "error",
                "duration_ms",
                "completed_at",
                "updated_at",
            ]
        )

    return {
        "status": tool_call.status,
        "result": tool_call.result,
        "error": tool_call.error,
        "duration_ms": tool_call.duration_ms,
    }


@shared_task
def fail_stale_assistant_runs() -> int:
    cutoff = timezone.now() - settings.AGENT_RUN_STALE_AFTER
    stale_runs = AssistantRun.objects.filter(
        status=AssistantRun.Status.RUNNING,
        updated_at__lt=cutoff,
    )
    count = stale_runs.update(
        status=AssistantRun.Status.FAILED,
        error="Assistant run timed out.",
        completed_at=timezone.now(),
        updated_at=timezone.now(),
    )
    return count
