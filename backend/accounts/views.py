from datetime import timedelta

from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import User, RegisteredDevice, LoginAttempt
from .permissions import IsSuperAdmin
from .serializers import (
    RegisterSerializer, LoginSerializer, UserSerializer,
    UserManagementSerializer, RegisteredDeviceSerializer, LoginAttemptSerializer,
)


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class LoginRateThrottle(ScopedRateThrottle):
    scope = 'login'


class RegisterRateThrottle(ScopedRateThrottle):
    scope = 'register'


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RegisterRateThrottle])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    username = serializer.validated_data['username']
    password = serializer.validated_data['password']
    fingerprint = serializer.validated_data.get('device_fingerprint', '')
    device_info = serializer.validated_data.get('device_info', {})
    ip = get_client_ip(request)
    ua = request.META.get('HTTP_USER_AGENT', '')

    user = authenticate(username=username, password=password)

    if not user:
        # Log failed credential attempt
        LoginAttempt.objects.create(
            username=username, fingerprint=fingerprint, ip_address=ip,
            user_agent=ua, device_info=device_info,
            success=False, failure_reason='invalid_credentials',
        )
        return Response({'non_field_errors': ['Invalid credentials.']}, status=status.HTTP_400_BAD_REQUEST)

    if not user.is_active:
        LoginAttempt.objects.create(
            user=user, username=username, fingerprint=fingerprint, ip_address=ip,
            user_agent=ua, device_info=device_info,
            success=False, failure_reason='account_disabled',
        )
        return Response({'non_field_errors': ['Account is disabled.']}, status=status.HTTP_400_BAD_REQUEST)

    # Device restriction: staff (non-superadmin) must use a registered device
    if user.is_staff and not user.is_superadmin and fingerprint:
        device_exists = RegisteredDevice.objects.filter(
            user=user, fingerprint=fingerprint, is_active=True
        ).exists()
        if not device_exists:
            LoginAttempt.objects.create(
                user=user, username=username, fingerprint=fingerprint, ip_address=ip,
                user_agent=ua, device_info=device_info,
                success=False, failure_reason='unregistered_device',
            )
            return Response({'non_field_errors': ['Invalid credentials.']}, status=status.HTTP_400_BAD_REQUEST)

    # Success
    LoginAttempt.objects.create(
        user=user, username=username, fingerprint=fingerprint, ip_address=ip,
        user_agent=ua, device_info=device_info, success=True,
    )
    refresh = RefreshToken.for_user(user)
    return Response({
        'user': UserSerializer(user).data,
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        refresh_token = request.data.get('refresh')
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({'detail': 'Logged out successfully.'})
    except TokenError:
        return Response({'detail': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    try:
        refresh = RefreshToken(request.data.get('refresh'))
        return Response({'access': str(refresh.access_token)})
    except TokenError:
        return Response({'detail': 'Invalid or expired token.'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def me(request):
    if request.method == 'GET':
        return Response(UserSerializer(request.user).data)
    serializer = UserSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── Superadmin: User Management ──────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsSuperAdmin])
def user_list(request):
    if request.method == 'GET':
        users = User.objects.all().order_by('-date_joined')
        return Response(UserManagementSerializer(users, many=True).data)

    serializer = UserManagementSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsSuperAdmin])
def user_detail(request, pk):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(UserManagementSerializer(user).data)

    if request.method == 'PATCH':
        serializer = UserManagementSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        if user == request.user:
            return Response({'detail': 'Cannot delete yourself.'}, status=status.HTTP_400_BAD_REQUEST)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Superadmin: Login Activity ───────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def login_activity(request):
    qs = LoginAttempt.objects.select_related('user').all()

    user_id = request.query_params.get('user')
    if user_id:
        qs = qs.filter(user_id=user_id)

    success = request.query_params.get('success')
    if success is not None:
        qs = qs.filter(success=success.lower() == 'true')

    days = request.query_params.get('days')
    if days:
        since = timezone.now() - timedelta(days=int(days))
        qs = qs.filter(created_at__gte=since)

    return Response(LoginAttemptSerializer(qs[:500], many=True).data)


# ─── Superadmin: Device Management ────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsSuperAdmin])
def device_list(request):
    if request.method == 'GET':
        devices = RegisteredDevice.objects.select_related('user').all().order_by('-registered_at')
        return Response(RegisteredDeviceSerializer(devices, many=True).data)

    serializer = RegisteredDeviceSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def device_from_attempt(request):
    """Register a device directly from a failed login attempt."""
    attempt_id = request.data.get('attempt_id')
    try:
        attempt = LoginAttempt.objects.get(pk=attempt_id)
    except LoginAttempt.DoesNotExist:
        return Response({'detail': 'Login attempt not found.'}, status=status.HTTP_404_NOT_FOUND)

    if not attempt.user:
        return Response({'detail': 'No user associated with this attempt.'}, status=status.HTTP_400_BAD_REQUEST)

    if not attempt.fingerprint:
        return Response({'detail': 'No fingerprint in this attempt.'}, status=status.HTTP_400_BAD_REQUEST)

    device, created = RegisteredDevice.objects.get_or_create(
        user=attempt.user,
        fingerprint=attempt.fingerprint,
        defaults={
            'device_name': attempt.device_info.get('device_name', ''),
            'user_agent': attempt.user_agent,
        }
    )
    if not created and not device.is_active:
        device.is_active = True
        device.save()

    return Response(RegisteredDeviceSerializer(device).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsSuperAdmin])
def device_detail(request, pk):
    try:
        device = RegisteredDevice.objects.get(pk=pk)
    except RegisteredDevice.DoesNotExist:
        return Response({'detail': 'Device not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PATCH':
        device.is_active = not device.is_active
        device.save()
        return Response(RegisteredDeviceSerializer(device).data)

    if request.method == 'DELETE':
        device.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
