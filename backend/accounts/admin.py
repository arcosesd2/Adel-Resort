from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, RegisteredDevice, LoginAttempt, FavoriteRoom, Notification, ActivityLog, NotificationPreference


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'first_name', 'last_name', 'email', 'email_verified', 'is_staff', 'is_admin', 'is_superadmin', 'bypass_device_authorization', 'is_active')
    list_filter = ('is_staff', 'is_admin', 'is_superadmin', 'bypass_device_authorization', 'is_active', 'email_verified')
    search_fields = ('username', 'first_name', 'last_name', 'email')
    ordering = ('username',)
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email', 'email_verified', 'phone', 'avatar')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_admin', 'is_superadmin', 'bypass_device_authorization', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'first_name', 'last_name', 'email', 'password1', 'password2'),
        }),
    )


@admin.register(RegisteredDevice)
class RegisteredDeviceAdmin(admin.ModelAdmin):
    list_display = ('user', 'device_name', 'fingerprint', 'is_active', 'registered_at')
    list_filter = ('is_active',)
    search_fields = ('user__username', 'device_name', 'fingerprint')


@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    list_display = ('username', 'success', 'failure_reason', 'ip_address', 'created_at')
    list_filter = ('success', 'failure_reason')
    search_fields = ('username', 'ip_address')
    readonly_fields = ('user', 'username', 'fingerprint', 'ip_address', 'user_agent', 'device_info', 'success', 'failure_reason', 'created_at')
    actions = ['approve_device']

    @admin.action(description='Approve device (register from selected attempts)')
    def approve_device(self, request, queryset):
        approved = 0
        skipped = 0
        for attempt in queryset:
            if not attempt.user or not attempt.fingerprint:
                skipped += 1
                continue
            device, created = RegisteredDevice.objects.get_or_create(
                user=attempt.user,
                fingerprint=attempt.fingerprint,
                defaults={
                    'device_name': attempt.device_info.get('device_name', '') if attempt.device_info else '',
                    'user_agent': attempt.user_agent,
                }
            )
            if not created and not device.is_active:
                device.is_active = True
                device.save()
            approved += 1
        self.message_user(request, f'{approved} device(s) approved, {skipped} skipped (no user/fingerprint).', messages.SUCCESS)


@admin.register(FavoriteRoom)
class FavoriteRoomAdmin(admin.ModelAdmin):
    list_display = ('user', 'room', 'created_at')
    search_fields = ('user__username', 'room__name')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'notification_type', 'title', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read')
    search_fields = ('user__username', 'title')


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'receive_events', 'receive_promotions', 'receive_booking_updates', 'updated_at')
    list_filter = ('receive_events', 'receive_promotions')
    search_fields = ('user__username',)


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'category', 'action', 'ip_address', 'created_at')
    list_filter = ('category',)
    search_fields = ('user__username', 'action', 'details')
    readonly_fields = ('user', 'category', 'action', 'details', 'ip_address', 'created_at')
