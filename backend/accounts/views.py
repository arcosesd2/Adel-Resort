from datetime import timedelta

from django.contrib.auth import authenticate
from django.contrib.auth.tokens import default_token_generator
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken, OutstandingToken, BlacklistedToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import (
    User, RegisteredDevice, LoginAttempt, FavoriteRoom, Notification, ActivityLog,
    NotificationPreference, create_notification, notify_staff, log_activity, get_or_create_preferences,
)
from .permissions import IsSuperAdmin
from .serializers import (
    RegisterSerializer, LoginSerializer, UserSerializer,
    UserManagementSerializer, RegisteredDeviceSerializer, LoginAttemptSerializer,
    ChangePasswordSerializer, DeactivateAccountSerializer,
    FavoriteRoomSerializer, NotificationSerializer, ActivityLogSerializer,
    NotificationPreferenceSerializer,
)
from .tokens import email_verification_token
from .emails import send_welcome_email, send_verification_email, send_password_reset_email


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class LoginRateThrottle(ScopedRateThrottle):
    scope = 'login'


class RegisterRateThrottle(ScopedRateThrottle):
    scope = 'register'


class PasswordResetRateThrottle(ScopedRateThrottle):
    scope = 'password_reset'


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RegisterRateThrottle])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        # Send welcome + verification emails (non-blocking)
        try:
            send_welcome_email(user)
        except Exception:
            import logging
            logging.getLogger(__name__).exception('Failed to send welcome email')
        try:
            if user.email:
                send_verification_email(user)
        except Exception:
            import logging
            logging.getLogger(__name__).exception('Failed to send verification email')
        return Response({
            'user': UserSerializer(user, context={'request': request}).data,
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

    # Device restriction: staff (non-superadmin) must use a registered device or authorize a new one
    if user.is_staff and not user.is_superadmin and fingerprint:
        device_exists = RegisteredDevice.objects.filter(
            user=user, fingerprint=fingerprint, is_active=True
        ).exists()
        if not device_exists:
            has_other_devices = RegisteredDevice.objects.filter(
                user=user, is_active=True
            ).exists()
            LoginAttempt.objects.create(
                user=user, username=username, fingerprint=fingerprint, ip_address=ip,
                user_agent=ua, device_info=device_info,
                success=False, failure_reason='unregistered_device',
            )
            if has_other_devices:
                return Response({'non_field_errors': ['This device is not authorized. Contact your admin to approve it.'], 'code': 'device_not_authorized'}, status=status.HTTP_403_FORBIDDEN)
            else:
                return Response({'non_field_errors': ['Please authorize this device to continue.'], 'code': 'device_authorization_required'}, status=status.HTTP_403_FORBIDDEN)

    # Success
    LoginAttempt.objects.create(
        user=user, username=username, fingerprint=fingerprint, ip_address=ip,
        user_agent=ua, device_info=device_info, success=True,
    )
    if user.is_staff or user.is_superadmin:
        log_activity(user, 'auth', 'Logged in', ip_address=ip)
    refresh = RefreshToken.for_user(user)
    return Response({
        'user': UserSerializer(user, context={'request': request}).data,
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
        return Response(UserSerializer(request.user, context={'request': request}).data)
    old_email = request.user.email
    serializer = UserSerializer(request.user, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        user = serializer.save()
        # Reset email_verified if email changed
        new_email = request.data.get('email')
        if new_email is not None and new_email != old_email:
            user.email_verified = False
            user.save(update_fields=['email_verified'])
        return Response(UserSerializer(user, context={'request': request}).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── Avatar Upload ───────────────────────────────────────────────────

@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def upload_avatar(request):
    user = request.user
    if request.method == 'DELETE':
        if user.avatar:
            user.avatar.delete(save=False)
            user.avatar = None
            user.save(update_fields=['avatar'])
        return Response({'detail': 'Avatar removed.'})

    avatar = request.FILES.get('avatar')
    if not avatar:
        return Response({'avatar': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate file type and size
    allowed_types = ['image/jpeg', 'image/png', 'image/webp']
    if avatar.content_type not in allowed_types:
        return Response({'avatar': 'Only JPEG, PNG, and WebP images are allowed.'}, status=status.HTTP_400_BAD_REQUEST)
    if avatar.size > 5 * 1024 * 1024:
        return Response({'avatar': 'Image must be under 5MB.'}, status=status.HTTP_400_BAD_REQUEST)

    # Delete old avatar if exists
    if user.avatar:
        user.avatar.delete(save=False)
    user.avatar = avatar
    user.save(update_fields=['avatar'])
    return Response(UserSerializer(user, context={'request': request}).data)


# ─── Change Password ─────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    if not user.check_password(serializer.validated_data['current_password']):
        return Response({'current_password': ['Current password is incorrect.']}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(serializer.validated_data['new_password'])
    user.save()

    # Blacklist all existing refresh tokens
    _blacklist_all_tokens(user)

    # Issue new tokens
    refresh = RefreshToken.for_user(user)
    return Response({
        'detail': 'Password changed successfully.',
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    })


# ─── Email Verification ──────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_verification_email_view(request):
    user = request.user
    if not user.email:
        return Response({'detail': 'No email address set.'}, status=status.HTTP_400_BAD_REQUEST)
    if user.email_verified:
        return Response({'detail': 'Email already verified.'})
    try:
        send_verification_email(user)
        return Response({'detail': 'Verification email sent.'})
    except Exception:
        import logging
        logging.getLogger(__name__).exception('Failed to send verification email')
        return Response({'detail': 'Failed to send verification email. Please try again later.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    uid = request.data.get('uid')
    token = request.data.get('token')
    if not uid or not token:
        return Response({'detail': 'Missing uid or token.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({'detail': 'Invalid link.'}, status=status.HTTP_400_BAD_REQUEST)

    if not email_verification_token.check_token(user, token):
        return Response({'detail': 'Invalid or expired link.'}, status=status.HTTP_400_BAD_REQUEST)

    user.email_verified = True
    user.save(update_fields=['email_verified'])
    return Response({'detail': 'Email verified successfully.'})


# ─── Forgot / Reset Password ─────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def forgot_password(request):
    email = request.data.get('email', '').strip()
    # Always return success to not reveal if email exists
    if email:
        try:
            user = User.objects.get(email__iexact=email)
            send_password_reset_email(user)
        except User.DoesNotExist:
            pass
    return Response({'detail': 'If an account with that email exists, a reset link has been sent.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    uid = request.data.get('uid')
    token = request.data.get('token')
    new_password = request.data.get('new_password')
    new_password2 = request.data.get('new_password2')

    if not all([uid, token, new_password, new_password2]):
        return Response({'detail': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)
    if new_password != new_password2:
        return Response({'new_password': ['Passwords do not match.']}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({'detail': 'Invalid link.'}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response({'detail': 'Invalid or expired link.'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate password
    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError
    try:
        validate_password(new_password, user)
    except ValidationError as e:
        return Response({'new_password': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()
    _blacklist_all_tokens(user)
    return Response({'detail': 'Password reset successfully.'})


# ─── Account Deactivation ────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deactivate_account(request):
    serializer = DeactivateAccountSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    if not user.check_password(serializer.validated_data['password']):
        return Response({'password': ['Password is incorrect.']}, status=status.HTTP_400_BAD_REQUEST)

    user.is_active = False
    user.save(update_fields=['is_active'])
    _blacklist_all_tokens(user)
    return Response({'detail': 'Account deactivated.'})


# ─── Favorites ────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def favorite_list(request):
    favorites = FavoriteRoom.objects.filter(user=request.user).select_related('room')
    serializer = FavoriteRoomSerializer(favorites, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_favorite(request):
    room_id = request.data.get('room_id')
    if not room_id:
        return Response({'room_id': 'This field is required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        favorite = FavoriteRoom.objects.get(user=request.user, room_id=room_id)
        favorite.delete()
        return Response({'favorited': False})
    except FavoriteRoom.DoesNotExist:
        from rooms.models import Room
        try:
            Room.objects.get(pk=room_id, is_active=True)
        except Room.DoesNotExist:
            return Response({'detail': 'Room not found.'}, status=status.HTTP_404_NOT_FOUND)
        FavoriteRoom.objects.create(user=request.user, room_id=room_id)
        return Response({'favorited': True}, status=status.HTTP_201_CREATED)


# ─── Notifications ────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_list(request):
    qs = Notification.objects.filter(user=request.user)
    unread_only = request.query_params.get('unread_only')
    if unread_only == 'true':
        qs = qs.filter(is_read=False)
    page_size = min(int(request.query_params.get('limit', 50)), 100)
    return Response(NotificationSerializer(qs[:page_size], many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_unread_count(request):
    count = Notification.objects.filter(user=request.user, is_read=False).count()
    return Response({'count': count})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def notification_read(request, pk):
    try:
        notification = Notification.objects.get(pk=pk, user=request.user)
    except Notification.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    notification.is_read = True
    notification.save(update_fields=['is_read'])
    return Response(NotificationSerializer(notification).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def notification_read_all(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'detail': 'All notifications marked as read.'})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def notification_delete(request, pk):
    try:
        notification = Notification.objects.get(pk=pk, user=request.user)
    except Notification.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    notification.delete()
    return Response({'detail': 'Notification deleted.'})


# ─── Notification Preferences ─────────────────────────────────────────

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def notification_preferences(request):
    prefs = get_or_create_preferences(request.user)
    if request.method == 'GET':
        return Response(NotificationPreferenceSerializer(prefs).data)

    serializer = NotificationPreferenceSerializer(prefs, data=request.data, partial=True)
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
        new_user = serializer.save()
        log_activity(request.user, 'user', f'Created user "{new_user.username}"',
                     ip_address=get_client_ip(request))
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
        # Protect superadmin: cannot be deactivated or have superadmin flag removed
        if user.is_superadmin:
            data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
            if 'is_active' in data and not data['is_active']:
                return Response(
                    {'detail': 'Superadmin accounts cannot be deactivated.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if 'is_superadmin' in data and not data['is_superadmin']:
                return Response(
                    {'detail': 'Superadmin status cannot be revoked.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        serializer = UserManagementSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            changes = ', '.join(f'{k}={v}' for k, v in request.data.items() if k != 'password')
            log_activity(request.user, 'user', f'Updated user "{user.username}"',
                         details=changes, ip_address=get_client_ip(request))
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        if user == request.user:
            return Response({'detail': 'Cannot delete yourself.'}, status=status.HTTP_400_BAD_REQUEST)
        if user.is_superadmin:
            return Response({'detail': 'Superadmin accounts cannot be deleted.'},
                            status=status.HTTP_400_BAD_REQUEST)
        log_activity(request.user, 'user', f'Deleted user "{user.username}"',
                     ip_address=get_client_ip(request))
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
        try:
            since = timezone.now() - timedelta(days=int(days))
            qs = qs.filter(created_at__gte=since)
        except (ValueError, TypeError):
            pass

    try:
        page_size = min(int(request.query_params.get('limit', 100)), 200)
    except (ValueError, TypeError):
        page_size = 100
    return Response(LoginAttemptSerializer(qs[:page_size], many=True).data)


# ─── Superadmin: Device Management ────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def authorize_device(request):
    """Authorize a device for a staff user logging in for the first time."""
    username = request.data.get('username', '')
    password = request.data.get('password', '')
    fingerprint = request.data.get('device_fingerprint', '')
    device_info = request.data.get('device_info', {})
    device_name = device_info.get('device_name', '') if isinstance(device_info, dict) else ''

    if not all([username, password, fingerprint]):
        return Response({'detail': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=username, password=password)
    if not user:
        return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_400_BAD_REQUEST)
    if not user.is_active:
        return Response({'detail': 'Account is disabled.'}, status=status.HTTP_400_BAD_REQUEST)
    if not user.is_staff or user.is_superadmin:
        return Response({'detail': 'Device authorization is for staff accounts only.'}, status=status.HTTP_400_BAD_REQUEST)

    has_other_devices = RegisteredDevice.objects.filter(user=user, is_active=True).exists()
    if has_other_devices:
        return Response({'detail': 'Your account already has authorized devices. Contact your admin.'}, status=status.HTTP_403_FORBIDDEN)

    device, created = RegisteredDevice.objects.get_or_create(
        user=user,
        fingerprint=fingerprint,
        defaults={
            'device_name': device_name,
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
        }
    )
    if not created and not device.is_active:
        device.is_active = True
        device.save()

    LoginAttempt.objects.create(
        user=user, username=username, fingerprint=fingerprint,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        device_info=device_info, success=True,
    )
    log_activity(user, 'device', f'Authorized device: {device_name or fingerprint[:12]}', ip_address=get_client_ip(request))

    refresh = RefreshToken.for_user(user)
    return Response({
        'user': UserSerializer(user, context={'request': request}).data,
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'detail': 'Device authorized successfully.',
    })


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def reset_user_devices(request, pk):
    """Reset all devices for a staff user, allowing them to authorize a new device."""
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    if not user.is_staff:
        return Response({'detail': 'Device reset is for staff accounts only.'}, status=status.HTTP_400_BAD_REQUEST)

    count, _ = RegisteredDevice.objects.filter(user=user).delete()
    _blacklist_all_tokens(user)
    log_activity(request.user, 'device', f'Reset {count} device(s) for "{user.username}"', ip_address=get_client_ip(request))
    return Response({'detail': f'Reset {count} device(s). {user.username} can now authorize a new device on next login.'})


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


# ─── Superadmin: Activity Log ─────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def activity_log(request):
    qs = ActivityLog.objects.select_related('user').all()

    user_id = request.query_params.get('user')
    if user_id:
        qs = qs.filter(user_id=user_id)

    category = request.query_params.get('category')
    if category:
        qs = qs.filter(category=category)

    days = request.query_params.get('days')
    if days:
        try:
            since = timezone.now() - timedelta(days=int(days))
            qs = qs.filter(created_at__gte=since)
        except (ValueError, TypeError):
            pass

    search = request.query_params.get('search', '').strip()
    if search:
        qs = qs.filter(action__icontains=search)

    try:
        page_size = min(int(request.query_params.get('limit', 100)), 500)
    except (ValueError, TypeError):
        page_size = 100
    return Response(ActivityLogSerializer(qs[:page_size], many=True).data)


# ─── Staff Notifications ──────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def staff_notification_list(request):
    if not request.user.is_staff:
        return Response({'detail': 'Staff only.'}, status=status.HTTP_403_FORBIDDEN)
    qs = Notification.objects.filter(user=request.user)
    unread_only = request.query_params.get('unread_only')
    if unread_only == 'true':
        qs = qs.filter(is_read=False)
    page_size = min(int(request.query_params.get('limit', 50)), 100)
    return Response(NotificationSerializer(qs[:page_size], many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def staff_notification_unread_count(request):
    if not request.user.is_staff:
        return Response({'detail': 'Staff only.'}, status=status.HTTP_403_FORBIDDEN)
    count = Notification.objects.filter(user=request.user, is_read=False).count()
    return Response({'count': count})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def staff_notification_read(request, pk):
    if not request.user.is_staff:
        return Response({'detail': 'Staff only.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        notification = Notification.objects.get(pk=pk, user=request.user)
    except Notification.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    notification.is_read = True
    notification.save(update_fields=['is_read'])
    return Response(NotificationSerializer(notification).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def staff_notification_read_all(request):
    if not request.user.is_staff:
        return Response({'detail': 'Staff only.'}, status=status.HTTP_403_FORBIDDEN)
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'detail': 'All notifications marked as read.'})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def staff_notification_delete(request, pk):
    if not request.user.is_staff:
        return Response({'detail': 'Staff only.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        notification = Notification.objects.get(pk=pk, user=request.user)
    except Notification.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    notification.delete()
    return Response({'detail': 'Notification deleted.'})


# ─── Helpers ──────────────────────────────────────────────────────────

def _blacklist_all_tokens(user):
    """Blacklist all outstanding refresh tokens for a user."""
    tokens = OutstandingToken.objects.filter(user=user)
    for token in tokens:
        try:
            BlacklistedToken.objects.get_or_create(token=token)
        except Exception:
            pass
