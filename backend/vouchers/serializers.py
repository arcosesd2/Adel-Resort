from rest_framework import serializers
from django.utils import timezone
from .models import Voucher


class VoucherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Voucher
        fields = (
            'id', 'code', 'discount_type', 'discount_value',
            'valid_from', 'valid_until', 'max_uses', 'times_used',
            'min_booking_amount', 'is_active', 'created_at',
        )
        read_only_fields = ('id', 'times_used', 'created_at')


class VoucherValidateSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50)
    booking_id = serializers.IntegerField()
