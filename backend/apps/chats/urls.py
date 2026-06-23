from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AssistantRunViewSet, ChatSessionViewSet

router = DefaultRouter()
router.register("sessions", ChatSessionViewSet, basename="chat-session")
router.register("runs", AssistantRunViewSet, basename="assistant-run")

urlpatterns = [
    path("", include(router.urls)),
]
