from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, RegisteredDevice, LoginAttempt


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'first_name', 'last_name', 'is_staff', 'is_superadmin', 'is_active')
    list_filter = ('is_staff', 'is_superadmin', 'is_active')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'phone')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superadmin', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2'),
        }),
    )


@admin.register(RegisteredDevice)
class RegisteredDeviceAdmin(admin.ModelAdmin):
    list_display = ('user', 'device_name', 'fingerprint', 'is_active', 'registered_at')
    list_filter = ('is_active',)
    search_fields = ('user__email', 'device_name', 'fingerprint')


@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    list_display = ('email', 'success', 'failure_reason', 'ip_address', 'created_at')
    list_filter = ('success', 'failure_reason')
    search_fields = ('email', 'ip_address')
    readonly_fields = ('user', 'email', 'fingerprint', 'ip_address', 'user_agent', 'device_info', 'success', 'failure_reason', 'created_at')
