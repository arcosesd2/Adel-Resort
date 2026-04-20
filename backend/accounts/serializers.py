from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User, RegisteredDevice, LoginAttempt, FavoriteRoom, Notification, ActivityLog, NotificationPreference


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=10)
    password2 = serializers.CharField(write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('username', 'first_name', 'last_name', 'phone', 'email', 'password', 'password2')

    def validate_password(self, value):
        from django.contrib.auth.password_validation import validate_password as dj_validate
        from django.core.exceptions import ValidationError as DjValidationError
        try:
            dj_validate(value)
        except DjValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        if not data.get('email'):
            raise serializers.ValidationError({'email': ['Email Address is Required']})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    device_fingerprint = serializers.CharField(required=False, allow_blank=True, default='')
    device_info = serializers.JSONField(required=False, default=dict)


class UserSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'phone', 'email',
                  'email_verified', 'avatar_url', 'date_joined', 'is_staff', 'is_admin', 'is_superadmin')
        read_only_fields = ('id', 'username', 'date_joined', 'is_staff', 'is_admin', 'is_superadmin', 'email_verified', 'avatar_url')

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class UserManagementSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=10)
    device_count = serializers.SerializerMethodField()
    login_count = serializers.SerializerMethodField()
    last_login = serializers.DateTimeField(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'phone', 'email',
                  'is_active', 'is_staff', 'is_admin', 'is_superadmin', 'date_joined', 'password',
                  'device_count', 'login_count', 'last_login')
        read_only_fields = ('id', 'date_joined', 'device_count', 'login_count', 'last_login', 'is_superadmin')

    def get_device_count(self, obj):
        return obj.registered_devices.filter(is_active=True).count()

    def get_login_count(self, obj):
        return obj.login_attempts.filter(success=True).count()

    def validate_password(self, value):
        from django.core.exceptions import ValidationError as DjValidationError
        try:
            validate_password(value)
        except DjValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({'password': 'Password is required when creating a user.'})
        return User.objects.create_user(password=password, **validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class RegisteredDeviceSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = RegisteredDevice
        fields = ('id', 'user', 'user_username', 'fingerprint', 'device_name', 'user_agent', 'registered_at', 'is_active')
        read_only_fields = ('id', 'registered_at')


class LoginAttemptSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True, default='')
    user_is_staff = serializers.BooleanField(source='user.is_staff', read_only=True, default=False)

    class Meta:
        model = LoginAttempt
        fields = ('id', 'user', 'user_username', 'username', 'fingerprint', 'ip_address', 'user_agent', 'device_info', 'success', 'failure_reason', 'created_at', 'user_is_staff')
        read_only_fields = fields


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=10)
    new_password2 = serializers.CharField(required=True)

    def validate_new_password(self, value):
        validate_password(value)
        return value

    def validate(self, data):
        if data['new_password'] != data['new_password2']:
            raise serializers.ValidationError({'new_password': 'New passwords do not match.'})
        return data


class DeactivateAccountSerializer(serializers.Serializer):
    password = serializers.CharField(required=True)
    confirmation = serializers.CharField(required=True)

    def validate_confirmation(self, value):
        if value != 'DEACTIVATE':
            raise serializers.ValidationError('You must type DEACTIVATE to confirm.')
        return value


class FavoriteRoomSerializer(serializers.ModelSerializer):
    room_id = serializers.IntegerField(source='room.id', read_only=True)
    room_name = serializers.CharField(source='room.name', read_only=True)
    room_type = serializers.CharField(source='room.room_type', read_only=True)
    day_price = serializers.DecimalField(source='room.day_price', max_digits=10, decimal_places=2, read_only=True)
    night_price = serializers.DecimalField(source='room.night_price', max_digits=10, decimal_places=2, read_only=True, allow_null=True)
    capacity = serializers.IntegerField(source='room.capacity', read_only=True)
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = FavoriteRoom
        fields = ('id', 'room_id', 'room_name', 'room_type', 'day_price', 'night_price',
                  'capacity', 'primary_image', 'created_at')

    def get_primary_image(self, obj):
        img = obj.room.images.filter(is_primary=True).first() or obj.room.images.first()
        if img and img.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(img.image.url)
            return img.image.url
        return None


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'notification_type', 'title', 'message', 'is_read', 'link', 'created_at')
        read_only_fields = fields


class ActivityLogSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True, default='')
    user_full_name = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = ('id', 'user', 'user_username', 'user_full_name', 'category', 'action', 'details', 'ip_address', 'created_at')
        read_only_fields = fields

    def get_user_full_name(self, obj):
        if obj.user:
            return obj.user.get_full_name()
        return ''


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = (
            'receive_events',
            'receive_promotions',
            'receive_booking_updates',
            'receive_checkin_reminders',
            'receive_review_requests',
            'updated_at',
        )
        read_only_fields = ('updated_at',)
