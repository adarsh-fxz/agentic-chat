from django.db import transaction
from django.http import StreamingHttpResponse
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.chats.services.audit import log_audit_event
from apps.chats.services.assistant import stream_assistant_run
from apps.chats.services.providers import get_active_provider_config

from .models import AssistantRun, ChatSession, Message
from .permissions import IsOwner
from .serializers import (
    AssistantRunSerializer,
    ChatSessionCreateSerializer,
    ChatSessionSerializer,
    CreateMessageSerializer,
    MessageSerializer,
)


class ChatSessionViewSet(viewsets.ModelViewSet):
    queryset = ChatSession.objects.none()
    permission_classes = [IsAuthenticated, IsOwner]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        queryset = ChatSession.objects.filter(user=self.request.user)

        if self.action in {"restore", "permanent"}:
            return queryset.order_by("-updated_at")

        if self.action == "list" and self.request.query_params.get("archived") == "true":
            return queryset.filter(archived_at__isnull=False).order_by("-updated_at")

        return queryset.filter(archived_at__isnull=True).order_by("-updated_at")

    def get_serializer_class(self):
        if self.action == "create":
            return ChatSessionCreateSerializer
        return ChatSessionSerializer

    def perform_create(self, serializer):
        session = serializer.save()
        log_audit_event(
            action="chat_session.created",
            request=self.request,
            target_type="chat_session",
            target_id=session.pk,
        )

    def perform_update(self, serializer):
        session = serializer.save()
        log_audit_event(
            action="chat_session.updated",
            request=self.request,
            target_type="chat_session",
            target_id=session.pk,
        )

    def perform_destroy(self, instance):
        instance.archived_at = timezone.now()
        instance.save(update_fields=["archived_at", "updated_at"])
        log_audit_event(
            action="chat_session.archived",
            request=self.request,
            target_type="chat_session",
            target_id=instance.pk,
        )

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        session = self.get_object()
        session.archived_at = None
        session.save(update_fields=["archived_at", "updated_at"])
        log_audit_event(
            action="chat_session.restored",
            request=request,
            target_type="chat_session",
            target_id=session.pk,
        )
        return Response(ChatSessionSerializer(session).data)

    @action(detail=True, methods=["delete"], url_path="permanent")
    def permanent(self, request, pk=None):
        session = self.get_object()
        if session.archived_at is None:
            return Response(
                {"detail": "Archive the chat before permanently deleting it."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session_id = session.pk
        session.delete()
        log_audit_event(
            action="chat_session.permanently_deleted",
            request=request,
            target_type="chat_session",
            target_id=session_id,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        session = self.get_object()
        if request.method == "POST":
            return self._create_message(request, session)

        messages = session.messages.all().order_by("created_at")
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    @transaction.atomic
    def _create_message(self, request, session):
        serializer = CreateMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = Message.objects.create(
            session=session,
            role=Message.Role.USER,
            content=serializer.validated_data["content"],
        )
        session.save(update_fields=["updated_at"])

        provider = get_active_provider_config()
        run = AssistantRun.objects.create(
            session=session,
            user_message=message,
            status=AssistantRun.Status.QUEUED,
            provider=provider.name,
            model=provider.model,
        )

        log_audit_event(
            action="message.created",
            request=request,
            target_type="message",
            target_id=message.pk,
            metadata={"session_id": str(session.pk), "run_id": str(run.pk)},
        )

        return Response(
            {
                "message": MessageSerializer(message).data,
                "run": AssistantRunSerializer(run).data,
            },
            status=status.HTTP_201_CREATED,
        )


class AssistantRunViewSet(
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    queryset = AssistantRun.objects.none()
    serializer_class = AssistantRunSerializer
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        return (
            AssistantRun.objects.filter(session__user=self.request.user)
            .select_related("session", "user_message", "assistant_message")
            .prefetch_related("tool_calls")
            .order_by("-created_at")
        )

    @extend_schema(responses={200: OpenApiTypes.STR})
    @action(detail=True, methods=["get"])
    def stream(self, request, pk=None):
        run = self.get_object()
        response = StreamingHttpResponse(
            stream_assistant_run(run.id, request.user.id),
            content_type="text/event-stream",
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response
