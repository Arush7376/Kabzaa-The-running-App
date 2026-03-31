"""
Registration and token login for mobile clients (DRF Token auth).
"""
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    """
    Create a user account and return an API token.
    Body: username, email (optional), password
    """
    username = (request.data.get("username") or "").strip()
    email = (request.data.get("email") or "").strip()
    password = request.data.get("password") or ""

    if not username or not password:
        return Response(
            {"error": "username and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {"error": "Username already taken."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if email:
        try:
            validate_email(email)
        except ValidationError:
            return Response(
                {"error": "Invalid email format."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {"error": "Email already registered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
    )
    token, _ = Token.objects.get_or_create(user=user)
    return Response(
        {"token": token.key, "username": user.username},
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    """
    Return an API token for valid credentials.
    Body: username, password
    """
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""

    if not username or not password:
        return Response(
            {"error": "username and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(username=username, password=password)
    if user is None:
        return Response(
            {"error": "Invalid username or password."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "username": user.username})
