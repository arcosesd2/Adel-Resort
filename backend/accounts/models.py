from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, username, password=None, **extra_fields):
        if not username:
            raise ValueError('Username is required')
        email = extra_fields.pop('email', None)
        if email:
            email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_superadmin', True)
        return self.create_user(username, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(blank=True, null=True)
    email_verified = models.BooleanField(default=False)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superadmin = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['email'],
                name='unique_email_when_not_null',
                condition=models.Q(email__isnull=False),
            ),
        ]

    def __str__(self):
        return self.username

    def get_full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()


class RegisteredDevice(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='registered_devices')
    fingerprint = models.CharField(max_length=64, db_index=True)
    device_name = models.CharField(max_length=255, blank=True)
    user_agent = models.TextField(blank=True)
    registered_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('user', 'fingerprint')

    def __str__(self):
        return f'{self.user.username} - {self.device_name or self.fingerprint[:12]}'


class LoginAttempt(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='login_attempts')
    username = models.CharField(max_length=150)
    fingerprint = models.CharField(max_length=64, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    device_info = models.JSONField(default=dict, blank=True)
    success = models.BooleanField(default=False)
    failure_reason = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        status = 'OK' if self.success else self.failure_reason
        return f'{self.username} - {status} - {self.created_at}'


class FavoriteRoom(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites')
    room = models.ForeignKey('rooms.Room', on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'room')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} - {self.room.name}'


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        BOOKING_CONFIRMED = 'booking_confirmed', 'Booking Confirmed'
        PAYMENT_RECEIVED = 'payment_received', 'Payment Received'
        BOOKING_CANCELLED = 'booking_cancelled', 'Booking Cancelled'
        BOOKING_COMPLETED = 'booking_completed', 'Booking Completed'
        REVIEW_APPROVED = 'review_approved', 'Review Approved'
        SYSTEM = 'system', 'System Message'
        PENDING_PAYMENT_REVIEW = 'pending_payment_review', 'Pending Payment Review'
        NEW_BOOKING = 'new_booking', 'New Booking'
        NEW_REVIEW_PENDING = 'new_review_pending', 'New Review Pending'
        NEW_MESSAGE = 'new_message', 'New Message'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=30, choices=NotificationType.choices)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} - {self.title}'


def create_notification(user, notification_type, title, message, link=''):
    return Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        link=link,
    )


def notify_staff(notification_type, title, message, link='', exclude_user=None):
    staff_users = User.objects.filter(is_staff=True)
    if exclude_user:
        staff_users = staff_users.exclude(pk=exclude_user.pk)
    notifications = []
    for staff in staff_users:
        notifications.append(Notification(
            user=staff,
            notification_type=notification_type,
            title=title,
            message=message,
            link=link,
        ))
    Notification.objects.bulk_create(notifications)
    try:
        from .emails import send_staff_notification_emails
        send_staff_notification_emails(notification_type, title, message, link, exclude_user=exclude_user)
    except Exception:
        pass
    return len(notifications)


class ActivityLog(models.Model):
    class ActionCategory(models.TextChoices):
        BOOKING = 'booking', 'Booking'
        PAYMENT = 'payment', 'Payment'
        ROOM = 'room', 'Room'
        CONTENT = 'content', 'Content'
        USER = 'user', 'User Management'
        REVIEW = 'review', 'Review'
        VOUCHER = 'voucher', 'Voucher'
        SETTINGS = 'settings', 'Settings'
        AUTH = 'auth', 'Authentication'

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='activity_logs')
    category = models.CharField(max_length=20, choices=ActionCategory.choices)
    action = models.CharField(max_length=255)
    details = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user} - {self.action} - {self.created_at}'


def log_activity(user, category, action, details='', ip_address=None):
    return ActivityLog.objects.create(
        user=user,
        category=category,
        action=action,
        details=details,
        ip_address=ip_address,
    )


class NotificationPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    receive_events = models.BooleanField(default=True)
    receive_promotions = models.BooleanField(default=True)
    receive_booking_updates = models.BooleanField(default=True)
    receive_checkin_reminders = models.BooleanField(default=True)
    receive_review_requests = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Preferences for {self.user.username}'


def get_or_create_preferences(user):
    prefs, _ = NotificationPreference.objects.get_or_create(user=user)
    return prefs
