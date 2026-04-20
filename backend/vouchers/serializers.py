from decimal import Decimal

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

    def validate_discount_value(self, value):
        if value is None or value < 0:
            raise serializers.ValidationError('Must be zero or greater.')
        return value

    def validate_max_uses(self, value):
        if value is not None and value < 1:
            raise serializers.ValidationError('Must be at least 1 (or leave blank for unlimited).')
        return value

    def validate_min_booking_amount(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError('Cannot be negative.')
        return value

    def validate(self, attrs):
        dtype = attrs.get('discount_type') or (self.instance.discount_type if self.instance else None)
        dvalue = attrs.get('discount_value')
        if dvalue is None and self.instance:
            dvalue = self.instance.discount_value
        if dtype == 'percentage' and dvalue is not None and dvalue > Decimal('100'):
            raise serializers.ValidationError({'discount_value': 'Percentage cannot exceed 100%.'})
        if dtype == 'fixed' and dvalue is not None and dvalue > Decimal('1000000'):
            raise serializers.ValidationError({'discount_value': 'Fixed discount cannot exceed PHP 1,000,000.'})
        valid_from = attrs.get('valid_from') or (self.instance.valid_from if self.instance else None)
        valid_until = attrs.get('valid_until') or (self.instance.valid_until if self.instance else None)
        if valid_from and valid_until and valid_from > valid_until:
            raise serializers.ValidationError({'valid_until': 'Must be on or after valid_from.'})
        return attrs


class VoucherValidateSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50)
    booking_id = serializers.IntegerField()
