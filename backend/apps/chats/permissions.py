from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    def has_object_permission(self, request, view, obj) -> bool:
        if hasattr(obj, "user_id"):
            return obj.user_id == request.user.id

        session = getattr(obj, "session", None)
        if session is not None:
            return session.user_id == request.user.id

        run = getattr(obj, "run", None)
        if run is not None:
            return run.session.user_id == request.user.id

        return False
