from django.urls import path

from .views import HealthCheckView, QueueHealthView

urlpatterns = [
    path("", HealthCheckView.as_view(), name="health"),
    path("queue/", QueueHealthView.as_view(), name="queue-health"),
]
