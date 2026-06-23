import secrets

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.chats.models import UserAPIKey
from apps.chats.services.audit import log_audit_event

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name")
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta:
        model = User
        fields = ("id", "username", "email", "password")
        read_only_fields = ("id",)

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class AuditedTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        request = self.context.get("request")
        log_audit_event(
            action="auth.login",
            request=request,
            actor=self.user,
            target_type="user",
            target_id=self.user.pk,
        )
        return data


class APIKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAPIKey
        fields = ("id", "name", "key_prefix", "last_used_at", "revoked_at", "created_at")
        read_only_fields = fields


class APIKeyCreateResponseSerializer(APIKeySerializer):
    key = serializers.CharField(read_only=True)

    class Meta(APIKeySerializer.Meta):
        fields = APIKeySerializer.Meta.fields + ("key",)


class CreateAPIKeySerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80)

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        raw_key = f"ack_{secrets.token_urlsafe(32)}"
        api_key = UserAPIKey.objects.create(
            user=request.user,
            name=validated_data["name"],
            key_prefix=raw_key[:12],
            key_hash=make_password(raw_key),
        )
        log_audit_event(
            action="api_key.created",
            request=request,
            target_type="api_key",
            target_id=api_key.pk,
            metadata={"name": api_key.name, "key_prefix": api_key.key_prefix},
        )
        return api_key, raw_key
