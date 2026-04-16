from decimal import Decimal

from rest_framework import serializers

from hr.models import Loan, LoanPayment


class LoanPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanPayment
        fields = (
            'id', 'loan', 'amount', 'payment_date', 'source',
            'payslip', 'reference', 'notes', 'recorded_by', 'created_at',
        )
        read_only_fields = ('id', 'recorded_by', 'created_at')


class LoanSerializer(serializers.ModelSerializer):
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    employee_name = serializers.SerializerMethodField()
    remaining_balance = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    payments = LoanPaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Loan
        fields = (
            'id', 'employee', 'employee_code', 'employee_name',
            'principal', 'interest_rate_percent', 'interest_method',
            'term_periods', 'installment_amount', 'purpose', 'start_date',
            'auto_deduct', 'status', 'disbursed_at', 'paid_off_at',
            'created_by', 'created_at', 'updated_at',
            'remaining_balance', 'total_paid', 'payments',
        )
        read_only_fields = (
            'id', 'employee_code', 'employee_name',
            'disbursed_at', 'paid_off_at', 'created_by', 'created_at', 'updated_at',
            'remaining_balance', 'total_paid', 'payments',
        )

    def get_employee_name(self, obj):
        return obj.employee.user.get_full_name() if obj.employee.user else ''

    def get_remaining_balance(self, obj):
        return str(obj.remaining_balance)

    def get_total_paid(self, obj):
        return str(obj.total_paid)


class LoanWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Loan
        fields = (
            'employee', 'principal', 'interest_rate_percent', 'interest_method',
            'term_periods', 'installment_amount', 'purpose', 'start_date', 'auto_deduct',
        )

    def validate(self, attrs):
        if attrs.get('principal', Decimal('0')) <= 0:
            raise serializers.ValidationError({'principal': 'Must be greater than zero.'})
        if attrs.get('installment_amount', Decimal('0')) <= 0:
            raise serializers.ValidationError({'installment_amount': 'Must be greater than zero.'})
        if attrs.get('term_periods', 0) <= 0:
            raise serializers.ValidationError({'term_periods': 'Must be greater than zero.'})
        return attrs
