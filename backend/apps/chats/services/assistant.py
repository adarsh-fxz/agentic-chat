import json
from collections.abc import Iterator

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from openai import OpenAI

from apps.chats.models import AssistantRun, Message, ToolCall
from apps.chats.serializers import AssistantRunSerializer, MessageSerializer, ToolCallSerializer
from apps.chats.services.audit import log_audit_event
from apps.chats.services.tools import (
    ToolExecutionError,
    ToolTimeoutError,
    execute_tool,
    get_openai_tools,
)

User = get_user_model()


class AssistantRunError(Exception):
    pass


def format_sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


def build_response_input(session) -> list[dict]:
    messages = session.messages.order_by("created_at")
    response_input = []

    for message in messages:
        if message.role not in {
            Message.Role.SYSTEM,
            Message.Role.USER,
            Message.Role.ASSISTANT,
        }:
            continue

        response_input.append(
            {
                "role": message.role,
                "content": message.content,
            }
        )

    return response_input


def get_usage_value(usage, name: str) -> int:
    if usage is None:
        return 0

    if isinstance(usage, dict):
        return usage.get(name, 0) or 0

    return getattr(usage, name, 0) or 0


def get_response_id(response) -> str:
    if response is None:
        return ""
    return getattr(response, "id", "") or ""


def get_response_output(response) -> list:
    return list(getattr(response, "output", None) or [])


def output_item_to_input(item):
    if isinstance(item, dict):
        return item

    if hasattr(item, "model_dump"):
        return item.model_dump()

    item_type = getattr(item, "type", "")
    if item_type == "function_call":
        return {
            "type": "function_call",
            "call_id": getattr(item, "call_id", ""),
            "name": getattr(item, "name", ""),
            "arguments": getattr(item, "arguments", "{}"),
        }

    return item


def get_function_calls(response) -> list:
    return [
        item
        for item in get_response_output(response)
        if getattr(item, "type", None) == "function_call"
        or (isinstance(item, dict) and item.get("type") == "function_call")
    ]


def get_item_value(item, name: str, default=""):
    if isinstance(item, dict):
        return item.get(name, default)
    return getattr(item, name, default)


def parse_tool_arguments(raw_arguments: str) -> dict:
    try:
        arguments = json.loads(raw_arguments or "{}")
    except json.JSONDecodeError as exc:
        raise ToolExecutionError("Tool arguments were not valid JSON.") from exc

    if not isinstance(arguments, dict):
        raise ToolExecutionError("Tool arguments must be a JSON object.")

    return arguments


def consume_response_stream(stream, run) -> Iterator[tuple[str, dict]]:
    for event in stream:
        event_type = getattr(event, "type", "")

        if event_type == "response.created":
            response = getattr(event, "response", None)
            response_id = get_response_id(response)
            if response_id and response_id != run.provider_response_id:
                run.provider_response_id = response_id
                run.save(update_fields=["provider_response_id", "updated_at"])
            yield "response.created", {"response_id": response_id}

        elif event_type == "response.output_text.delta":
            delta = getattr(event, "delta", "") or ""
            if delta:
                yield "delta", {"text": delta}

        elif event_type == "response.completed":
            yield "response.completed", {"response": getattr(event, "response", None)}

        elif event_type in {"response.failed", "response.incomplete"}:
            response = getattr(event, "response", None)
            raise AssistantRunError(str(getattr(response, "error", "") or event_type))


def execute_model_tool_call(run, item) -> tuple[dict, ToolCall]:
    call_id = get_item_value(item, "call_id")
    name = get_item_value(item, "name")
    raw_arguments = get_item_value(item, "arguments", "{}")

    try:
        arguments = parse_tool_arguments(raw_arguments)
    except ToolExecutionError as exc:
        tool_call = ToolCall.objects.create(
            run=run,
            external_id=call_id,
            name=name,
            status=ToolCall.Status.FAILED,
            arguments={},
            error=str(exc),
            completed_at=timezone.now(),
        )
        return {
            "type": "function_call_output",
            "call_id": call_id,
            "output": json.dumps({"error": tool_call.error}),
        }, tool_call

    tool_call = ToolCall.objects.create(
        run=run,
        external_id=call_id,
        name=name,
        status=ToolCall.Status.RUNNING,
        arguments=arguments,
        started_at=timezone.now(),
    )

    try:
        if name == "session_summary" and str(arguments.get("session_id")) != str(run.session_id):
            raise ToolExecutionError("session_summary can only read the current chat session.")

        result, error, duration_ms = execute_tool(name, arguments)
        tool_call.status = ToolCall.Status.COMPLETED
        tool_call.result = result
        tool_call.error = error
        tool_call.duration_ms = duration_ms
    except ToolTimeoutError as exc:
        tool_call.status = ToolCall.Status.TIMED_OUT
        tool_call.error = str(exc)
    except Exception as exc:
        tool_call.status = ToolCall.Status.FAILED
        tool_call.error = str(exc)

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

    if tool_call.status != ToolCall.Status.COMPLETED:
        output = {"error": tool_call.error}
    else:
        output = tool_call.result

    return {
        "type": "function_call_output",
        "call_id": call_id,
        "output": json.dumps(output, default=str),
    }, tool_call


def stream_assistant_run(run_id, user_id) -> Iterator[str]:
    run = (
        AssistantRun.objects.select_related("session", "user_message", "assistant_message")
        .filter(id=run_id, session__user_id=user_id)
        .first()
    )
    user = User.objects.filter(id=user_id).first()

    if run is None:
        yield format_sse("error", {"detail": "Run not found."})
        return

    if run.status not in {AssistantRun.Status.QUEUED, AssistantRun.Status.FAILED}:
        yield format_sse("error", {"detail": f"Run is already {run.status}."})
        return

    if not settings.OPENAI_API_KEY:
        run.status = AssistantRun.Status.FAILED
        run.error = "OPENAI_API_KEY is not configured."
        run.completed_at = timezone.now()
        run.save(update_fields=["status", "error", "completed_at", "updated_at"])
        yield format_sse("error", {"detail": run.error})
        return

    run.status = AssistantRun.Status.RUNNING
    run.started_at = timezone.now()
    run.model = run.model or settings.OPENAI_MODEL
    run.error = ""
    run.save(update_fields=["status", "started_at", "model", "error", "updated_at"])

    yield format_sse("run.started", AssistantRunSerializer(run).data)

    text_parts: list[str] = []
    final_response = None
    input_list = build_response_input(run.session)
    usage_totals = {
        "input_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0,
    }

    try:
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        stream = client.responses.create(
            model=run.model,
            input=input_list,
            stream=True,
            tools=get_openai_tools(),
            metadata={
                "run_id": str(run.id),
                "session_id": str(run.session_id),
                "user_id": str(user_id),
            },
        )

        for event_name, payload in consume_response_stream(stream, run):
            if event_name == "delta":
                text_parts.append(payload["text"])
                yield format_sse(event_name, payload)
            elif event_name == "response.completed":
                final_response = payload["response"]
            else:
                yield format_sse(event_name, payload)

        usage = getattr(final_response, "usage", None)
        usage_totals["input_tokens"] += get_usage_value(usage, "input_tokens")
        usage_totals["output_tokens"] += get_usage_value(usage, "output_tokens")
        usage_totals["total_tokens"] += get_usage_value(usage, "total_tokens")

        function_calls = get_function_calls(final_response)
        if function_calls:
            text_parts = []
            input_list.extend(output_item_to_input(item) for item in get_response_output(final_response))

            for item in function_calls:
                name = get_item_value(item, "name")
                call_id = get_item_value(item, "call_id")
                yield format_sse("tool.started", {"name": name, "call_id": call_id})
                output_item, tool_call = execute_model_tool_call(run, item)
                input_list.append(output_item)
                event_name = (
                    "tool.completed"
                    if tool_call.status == ToolCall.Status.COMPLETED
                    else "tool.failed"
                )
                yield format_sse(
                    event_name,
                    ToolCallSerializer(tool_call).data,
                )

            stream = client.responses.create(
                model=run.model,
                input=input_list,
                stream=True,
                tools=get_openai_tools(),
                metadata={
                    "run_id": str(run.id),
                    "session_id": str(run.session_id),
                    "user_id": str(user_id),
                },
            )

            final_response = None
            for event_name, payload in consume_response_stream(stream, run):
                if event_name == "delta":
                    text_parts.append(payload["text"])
                    yield format_sse(event_name, payload)
                elif event_name == "response.completed":
                    final_response = payload["response"]
                else:
                    yield format_sse(event_name, payload)

            usage = getattr(final_response, "usage", None)
            usage_totals["input_tokens"] += get_usage_value(usage, "input_tokens")
            usage_totals["output_tokens"] += get_usage_value(usage, "output_tokens")
            usage_totals["total_tokens"] += get_usage_value(usage, "total_tokens")

        final_text = "".join(text_parts).strip()
        if not final_text:
            raise AssistantRunError("Assistant response was empty.")

        response_id = get_response_id(final_response)
        usage = getattr(final_response, "usage", None)

        assistant_message = Message.objects.create(
            session=run.session,
            role=Message.Role.ASSISTANT,
            content=final_text,
            metadata={"provider_response_id": response_id},
        )

        run.assistant_message = assistant_message
        run.status = AssistantRun.Status.COMPLETED
        run.provider_response_id = response_id or run.provider_response_id
        run.prompt_tokens = usage_totals["input_tokens"]
        run.completion_tokens = usage_totals["output_tokens"]
        run.total_tokens = usage_totals["total_tokens"]
        run.completed_at = timezone.now()
        run.save(
            update_fields=[
                "assistant_message",
                "status",
                "provider_response_id",
                "prompt_tokens",
                "completion_tokens",
                "total_tokens",
                "completed_at",
                "updated_at",
            ]
        )
        run.session.save(update_fields=["updated_at"])

        log_audit_event(
            action="assistant_run.completed",
            actor=user,
            target_type="assistant_run",
            target_id=run.pk,
            metadata={
                "session_id": str(run.session_id),
                "message_id": str(assistant_message.pk),
                "total_tokens": run.total_tokens,
            },
        )

        yield format_sse(
            "run.completed",
            {
                "run": AssistantRunSerializer(run).data,
                "message": MessageSerializer(assistant_message).data,
            },
        )

    except Exception as exc:
        run.status = AssistantRun.Status.FAILED
        run.error = str(exc)
        run.completed_at = timezone.now()
        run.save(update_fields=["status", "error", "completed_at", "updated_at"])
        log_audit_event(
            action="assistant_run.failed",
            actor=user,
            target_type="assistant_run",
            target_id=run.pk,
            metadata={"error": run.error},
        )
        yield format_sse("error", {"detail": run.error})
