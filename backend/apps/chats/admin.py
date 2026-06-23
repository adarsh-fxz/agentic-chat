from django.contrib import admin

from .models import AuditLog, AssistantRun, ChatSession, Message, ToolCall, UserAPIKey


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "title", "archived_at", "updated_at")
    list_filter = ("archived_at",)
    search_fields = ("id", "title", "user__username", "user__email")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "role", "created_at")
    list_filter = ("role",)
    search_fields = ("id", "session__id", "content")


@admin.register(AssistantRun)
class AssistantRunAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "status", "model", "total_tokens", "created_at")
    list_filter = ("status", "provider", "model")
    search_fields = ("id", "session__id", "provider_response_id")


@admin.register(ToolCall)
class ToolCallAdmin(admin.ModelAdmin):
    list_display = ("id", "run", "name", "status", "duration_ms", "created_at")
    list_filter = ("status", "name")
    search_fields = ("id", "run__id", "external_id", "name")


@admin.register(UserAPIKey)
class UserAPIKeyAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "name", "key_prefix", "last_used_at", "revoked_at")
    list_filter = ("revoked_at",)
    search_fields = ("id", "user__username", "user__email", "name", "key_prefix")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("id", "actor", "action", "target_type", "target_id", "created_at")
    list_filter = ("action", "target_type")
    search_fields = ("id", "actor__username", "actor__email", "action", "target_id")
