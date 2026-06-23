from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from .models import AssistantRun, ChatSession, Message, ToolCall


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ("id", "role", "content", "metadata", "created_at")
        read_only_fields = fields


class CreateMessageSerializer(serializers.Serializer):
    content = serializers.CharField(allow_blank=False, trim_whitespace=True)


class ChatSessionSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = (
            "id",
            "title",
            "archived_at",
            "created_at",
            "updated_at",
            "last_message",
        )
        read_only_fields = ("id", "archived_at", "created_at", "updated_at", "last_message")

    @extend_schema_field(serializers.DictField(allow_null=True))
    def get_last_message(self, obj):
        message = getattr(obj, "last_prefetched_message", None)
        if message is None:
            message = obj.messages.order_by("-created_at").first()

        if message is None:
            return None

        return {
            "id": message.id,
            "role": message.role,
            "content": message.content,
            "created_at": message.created_at,
        }


class ChatSessionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatSession
        fields = ("id", "title", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def create(self, validated_data):
        return ChatSession.objects.create(
            user=self.context["request"].user,
            **validated_data,
        )


class ToolCallSerializer(serializers.ModelSerializer):
    class Meta:
        model = ToolCall
        fields = (
            "id",
            "external_id",
            "name",
            "status",
            "arguments",
            "result",
            "error",
            "duration_ms",
            "started_at",
            "completed_at",
            "created_at",
        )
        read_only_fields = fields


class AssistantRunSerializer(serializers.ModelSerializer):
    tool_calls = ToolCallSerializer(many=True, read_only=True)

    class Meta:
        model = AssistantRun
        fields = (
            "id",
            "session",
            "user_message",
            "assistant_message",
            "status",
            "provider",
            "model",
            "provider_response_id",
            "prompt_tokens",
            "completion_tokens",
            "total_tokens",
            "error",
            "started_at",
            "completed_at",
            "created_at",
            "tool_calls",
        )
        read_only_fields = fields
