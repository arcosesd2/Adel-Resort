from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ('id', 'booking', 'gcash_reference', 'amount', 'currency', 'status', 'created_at')
        read_only_fields = fields


class SubmitProofSerializer(serializers.Serializer):
    booking_id = serializers.IntegerField()
    gcash_reference = serializers.CharField(max_length=200)
    proof_of_payment = serializers.ImageField()
