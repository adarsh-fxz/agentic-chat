from __future__ import annotations

import ast
import operator
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Callable

from django.conf import settings
from jsonschema import Draft202012Validator


class ToolExecutionError(Exception):
    pass


class ToolTimeoutError(ToolExecutionError):
    pass


@dataclass(frozen=True)
class ToolDefinition:
    name: str
    description: str
    parameters: dict[str, Any]
    handler: Callable[..., dict[str, Any]]

    def as_openai_tool(self) -> dict[str, Any]:
        return {
            "type": "function",
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters,
            "strict": True,
        }


ALLOWED_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


def evaluate_math_expression(expression: str) -> Decimal:
    tree = ast.parse(expression, mode="eval")

    def eval_node(node):
        if isinstance(node, ast.Expression):
            return eval_node(node.body)

        if isinstance(node, ast.Constant) and isinstance(node.value, int | float):
            return Decimal(str(node.value))

        if isinstance(node, ast.BinOp) and type(node.op) in ALLOWED_OPERATORS:
            left = eval_node(node.left)
            right = eval_node(node.right)
            if isinstance(node.op, ast.Pow) and abs(right) > 10:
                raise ToolExecutionError("Exponent is too large.")
            return ALLOWED_OPERATORS[type(node.op)](left, right)

        if isinstance(node, ast.UnaryOp) and type(node.op) in ALLOWED_OPERATORS:
            return ALLOWED_OPERATORS[type(node.op)](eval_node(node.operand))

        raise ToolExecutionError("Unsupported calculator expression.")

    result = eval_node(tree)
    return +result


def calculator(expression: str) -> dict[str, Any]:
    result = evaluate_math_expression(expression)
    return {
        "expression": expression,
        "result": str(result),
    }


def session_summary(session_id: str, max_messages: int = 5) -> dict[str, Any]:
    from apps.chats.models import ChatSession

    session = ChatSession.objects.get(id=session_id)
    messages = list(session.messages.order_by("-created_at")[:max_messages])
    messages.reverse()

    return {
        "session_id": str(session.id),
        "title": session.title,
        "message_count": session.messages.count(),
        "recent_messages": [
            {
                "role": message.role,
                "content": message.content[:500],
                "created_at": message.created_at.isoformat(),
            }
            for message in messages
        ],
    }


TOOL_REGISTRY = {
    "calculator": ToolDefinition(
        name="calculator",
        description="Evaluate a basic arithmetic expression. Supports numbers and +, -, *, /, //, %, and **.",
        parameters={
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Arithmetic expression to evaluate, for example '12 * (4 + 3)'.",
                    "maxLength": 160,
                },
            },
            "required": ["expression"],
            "additionalProperties": False,
        },
        handler=calculator,
    ),
    "session_summary": ToolDefinition(
        name="session_summary",
        description="Read a short summary of the current chat session from the application database.",
        parameters={
            "type": "object",
            "properties": {
                "session_id": {
                    "type": "string",
                    "description": "UUID of the chat session to summarize.",
                },
                "max_messages": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 10,
                    "default": 5,
                },
            },
            "required": ["session_id", "max_messages"],
            "additionalProperties": False,
        },
        handler=session_summary,
    ),
}


def get_openai_tools() -> list[dict[str, Any]]:
    return [tool.as_openai_tool() for tool in TOOL_REGISTRY.values()]


def execute_tool(name: str, arguments: dict[str, Any]) -> tuple[dict[str, Any] | None, str, int]:
    tool = TOOL_REGISTRY.get(name)
    if tool is None:
        raise ToolExecutionError(f"Tool '{name}' is not allowed.")

    validator = Draft202012Validator(tool.parameters)
    errors = sorted(validator.iter_errors(arguments), key=lambda error: error.path)
    if errors:
        message = "; ".join(error.message for error in errors)
        raise ToolExecutionError(f"Invalid tool arguments: {message}")

    started = time.monotonic()
    timeout = settings.AGENT_TOOL_TIMEOUT_SECONDS

    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(tool.handler, **arguments)
    try:
        result = future.result(timeout=timeout)
    except TimeoutError as exc:
        future.cancel()
        raise ToolTimeoutError(f"Tool '{name}' timed out after {timeout} seconds.") from exc
    finally:
        executor.shutdown(wait=False, cancel_futures=True)

    duration_ms = int((time.monotonic() - started) * 1000)
    return result, "", duration_ms
