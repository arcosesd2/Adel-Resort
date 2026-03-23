from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, RegisteredDevice, LoginAttempt


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'phone', 'password', 'password2')

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    device_fingerprint = serializers.CharField(required=False, allow_blank=True, default='')
    device_info = serializers.JSONField(required=False, default=dict)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'phone', 'date_joined', 'is_staff', 'is_superadmin')
        read_only_fields = ('id', 'email', 'date_joined', 'is_staff', 'is_superadmin')


class UserManagementSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'phone', 'is_active', 'is_staff', 'is_superadmin', 'date_joined', 'password')
        read_only_fields = ('id', 'date_joined')

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
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = RegisteredDevice
        fields = ('id', 'user', 'user_email', 'fingerprint', 'device_name', 'user_agent', 'registered_at', 'is_active')
        read_only_fields = ('id', 'registered_at')


class LoginAttemptSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True, default='')

    class Meta:
        model = LoginAttempt
        fields = ('id', 'user', 'user_email', 'email', 'fingerprint', 'ip_address', 'user_agent', 'device_info', 'success', 'failure_reason', 'created_at')
        read_only_fields = fields
