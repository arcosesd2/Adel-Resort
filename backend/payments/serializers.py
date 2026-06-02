from rest_framework import serializers
from .models import Payment, PaymentType, GCashConfig


def validate_image_upload(value, *, max_size_mb=10):
    allowed_types = ['image/jpeg', 'image/png', 'image/webp']
    if value.content_type not in allowed_types:
        raise serializers.ValidationError('Only JPEG, PNG, or WebP images are allowed.')
    if value.size > max_size_mb * 1024 * 1024:
        raise serializers.ValidationError(f'File size must be under {max_size_mb}MB.')
    try:
        from PIL import Image
        img = Image.open(value)
        img.verify()
        value.seek(0)
    except Exception:
        raise serializers.ValidationError('File is not a valid image.')
    return value


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ('id', 'booking', 'gcash_reference', 'payment_type', 'amount', 'currency', 'promo_discount', 'voucher_discount', 'status', 'created_at')
        read_only_fields = fields


class AdminPaymentSerializer(serializers.ModelSerializer):
    booking_reference = serializers.CharField(source='booking.reference_code', read_only=True)
    booking_id = serializers.IntegerField(source='booking.id', read_only=True)
    guest_name = serializers.SerializerMethodField()
    guest_email = serializers.CharField(source='booking.user.email', read_only=True)
    room_name = serializers.CharField(source='booking.room.name', read_only=True)
    booking_status = serializers.CharField(source='booking.status', read_only=True)
    proof_of_payment_url = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = (
            'id', 'booking_id', 'booking_reference', 'guest_name', 'guest_email',
            'room_name', 'booking_status', 'gcash_reference', 'proof_of_payment_url',
            'payment_type', 'amount', 'currency', 'promo_discount', 'voucher_discount', 'status', 'created_at', 'updated_at',
        )
        read_only_fields = (
            'id', 'booking_id', 'booking_reference', 'guest_name', 'guest_email',
            'room_name', 'booking_status', 'gcash_reference', 'proof_of_payment_url',
            'payment_type', 'amount', 'currency', 'promo_discount', 'voucher_discount', 'created_at', 'updated_at',
        )

    def get_guest_name(self, obj):
        u = obj.booking.user
        full = f'{u.first_name} {u.last_name}'.strip()
        return full or u.username

    def get_proof_of_payment_url(self, obj):
        if obj.proof_of_payment:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.proof_of_payment.url)
            return obj.proof_of_payment.url
        return None


class SubmitProofSerializer(serializers.Serializer):
    booking_id = serializers.IntegerField()
    gcash_reference = serializers.CharField(max_length=200)
    proof_of_payment = serializers.ImageField()
    payment_type = serializers.ChoiceField(choices=PaymentType.choices, default=PaymentType.FULL, required=False)
    custom_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

    def validate_proof_of_payment(self, value):
        return validate_image_upload(value, max_size_mb=10)


class GCashConfigSerializer(serializers.ModelSerializer):
    qr_code_url = serializers.SerializerMethodField()

    class Meta:
        model = GCashConfig
        fields = ('gcash_number', 'account_name', 'qr_code', 'qr_code_url', 'updated_at')
        extra_kwargs = {'qr_code': {'required': False}}

    def get_qr_code_url(self, obj):
        if obj.qr_code:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.qr_code.url)
            return obj.qr_code.url
        return None

    def validate_qr_code(self, value):
        return validate_image_upload(value, max_size_mb=5)
