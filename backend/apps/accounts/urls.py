from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    APIKeyListCreateView,
    APIKeyRevokeView,
    AuditedTokenObtainPairView,
    MeView,
    RegisterView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("token/", AuditedTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("api-keys/", APIKeyListCreateView.as_view(), name="api_key_list_create"),
    path("api-keys/<uuid:key_id>/revoke/", APIKeyRevokeView.as_view(), name="api_key_revoke"),
]
