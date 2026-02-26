from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ('id', 'booking', 'stripe_payment_id', 'amount', 'currency', 'status', 'created_at')
        read_only_fields = fields


class CreatePaymentIntentSerializer(serializers.Serializer):
    booking_id = serializers.IntegerField()
