from rest_framework import serializers
from .models import Payment, GCashConfig


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ('id', 'booking', 'gcash_reference', 'payment_type', 'amount', 'currency', 'status', 'created_at')
        read_only_fields = fields


class SubmitProofSerializer(serializers.Serializer):
    booking_id = serializers.IntegerField()
    gcash_reference = serializers.CharField(max_length=200)
    proof_of_payment = serializers.ImageField()
    payment_type = serializers.ChoiceField(choices=['full', 'downpayment'], default='full')


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
