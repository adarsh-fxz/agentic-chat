from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.chats.models import UserAPIKey
from apps.chats.services.audit import log_audit_event

from .serializers import (
    APIKeyCreateResponseSerializer,
    APIKeySerializer,
    AuditedTokenObtainPairSerializer,
    CreateAPIKeySerializer,
    RegisterSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
    throttle_scope = "auth"

    def perform_create(self, serializer):
        user = serializer.save()
        log_audit_event(
            action="auth.register",
            request=self.request,
            actor=user,
            target_type="user",
            target_id=user.pk,
        )


class AuditedTokenObtainPairView(TokenObtainPairView):
    serializer_class = AuditedTokenObtainPairSerializer
    throttle_scope = "token"


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=UserSerializer)
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class APIKeyListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "api_key"

    @extend_schema(responses=APIKeySerializer(many=True))
    def get(self, request):
        keys = UserAPIKey.objects.filter(user=request.user).order_by("-created_at")
        return Response(APIKeySerializer(keys, many=True).data)

    @extend_schema(
        request=CreateAPIKeySerializer,
        responses={201: APIKeyCreateResponseSerializer},
    )
    def post(self, request):
        serializer = CreateAPIKeySerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        api_key, raw_key = serializer.save()
        data = APIKeySerializer(api_key).data
        data["key"] = raw_key
        return Response(data, status=status.HTTP_201_CREATED)


class APIKeyRevokeView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "api_key"

    @extend_schema(request=None, responses=APIKeySerializer)
    @transaction.atomic
    def post(self, request, key_id):
        api_key = generics.get_object_or_404(
            UserAPIKey.objects.select_for_update(),
            id=key_id,
            user=request.user,
            revoked_at__isnull=True,
        )
        api_key.revoked_at = timezone.now()
        api_key.save(update_fields=["revoked_at", "updated_at"])
        log_audit_event(
            action="api_key.revoked",
            request=request,
            target_type="api_key",
            target_id=api_key.pk,
            metadata={"name": api_key.name, "key_prefix": api_key.key_prefix},
        )
        return Response(APIKeySerializer(api_key).data)
