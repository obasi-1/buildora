import logging
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.utils.encoding import force_bytes, force_str
from django.utils.http import (
    urlsafe_base64_decode,
    urlsafe_base64_encode,
)

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .serializers import (
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileSerializer,
    RegisterSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return self.request.user


class PasswordResetRequestThrottle(AnonRateThrottle):
    scope = "password_reset_request"
    rate = "5/hour"


class PasswordResetConfirmThrottle(AnonRateThrottle):
    scope = "password_reset_confirm"
    rate = "20/hour"


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [PasswordResetRequestThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        frontend_url = settings.FRONTEND_URL.rstrip("/")

        users = User.objects.filter(
            email__iexact=email,
            is_active=True,
        )

        for user in users:
            if not user.has_usable_password():
                continue

            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            query = urlencode({
                "uid": uid,
                "token": token,
            })

            reset_url = (
                f"{frontend_url}/#reset-password?{query}"
            )

            message = (
                f"Hello {user.get_username()},\n\n"
                "We received a request to reset your Buildora password.\n\n"
                "Open this link to choose a new password:\n"
                f"{reset_url}\n\n"
                "This link expires after "
                f"{settings.PASSWORD_RESET_TIMEOUT // 60} minutes "
                "and cannot be reused after a successful reset.\n\n"
                "If you did not request this, ignore this email. "
                "Your password will remain unchanged.\n\n"
                "The Buildora team"
            )

            try:
                send_mail(
                    subject="Reset your Buildora password",
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception:
                # Do not expose email addresses or reset links in logs.
                logger.error("Password reset email could not be sent.")

        # Use the same response whether an account was found or not.
        return Response({
            "detail": (
                "If an eligible account uses this email address, "
                "you will receive a password reset link."
            )
        })


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [PasswordResetConfirmThrottle]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        invalid_link = {
            "detail": (
                "This reset link is invalid or has expired. "
                "Please request a new one."
            )
        }

        with transaction.atomic():
            try:
                user_id = force_str(
                    urlsafe_base64_decode(data["uid"])
                )

                user = User.objects.select_for_update().get(
                    pk=user_id,
                    is_active=True,
                )
            except (
                User.DoesNotExist,
                ValueError,
                TypeError,
                OverflowError,
                UnicodeDecodeError,
                ValidationError,
            ):
                return Response(
                    invalid_link,
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if (
                not user.has_usable_password()
                or not default_token_generator.check_token(
                    user, data["token"]
                )
            ):
                return Response(
                    invalid_link,
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                validate_password(
                    data["new_password"],
                    user=user,
                )
            except ValidationError as error:
                return Response(
                    {"new_password": error.messages},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user.set_password(data["new_password"])
            user.save(update_fields=["password"])

        return Response({
            "detail": (
                "Your password has been reset. "
                "You can now log in with your new password."
            )
        })