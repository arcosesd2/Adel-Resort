from decimal import Decimal

from rest_framework import serializers

from hr.models import Loan, LoanPayment


class LoanPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanPayment
        fields = (
            'id', 'loan', 'amount', 'payment_date', 'source',
            'payslip', 'reference', 'notes', 'recorded_by', 'created_at',
            'is_voided',
        )
        read_only_fields = ('id', 'loan', 'payslip', 'recorded_by', 'created_at', 'is_voided')

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Must be greater than zero.')
        return value

    def validate(self, attrs):
        # Enforce amount ≤ remaining_balance when loan context is known.
        # View passes loan via serializer.save(loan=loan); for binding-time
        # validation we check against the instance's loan when present.
        loan = self.context.get('loan')
        if loan is not None and attrs.get('amount') is not None:
            if attrs['amount'] > loan.remaining_balance:
                raise serializers.ValidationError({
                    'amount': f'Cannot exceed remaining balance of PHP {loan.remaining_balance}.'
                })
        return attrs


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
        principal = attrs.get('principal', Decimal('0'))
        if principal <= 0:
            raise serializers.ValidationError({'principal': 'Must be greater than zero.'})
        if principal > Decimal('10000000'):
            raise serializers.ValidationError({'principal': 'Cannot exceed PHP 10,000,000.'})
        installment = attrs.get('installment_amount', Decimal('0'))
        if installment <= 0:
            raise serializers.ValidationError({'installment_amount': 'Must be greater than zero.'})
        if installment > principal:
            raise serializers.ValidationError({'installment_amount': 'Cannot exceed principal.'})
        term = attrs.get('term_periods', 0)
        if term <= 0:
            raise serializers.ValidationError({'term_periods': 'Must be greater than zero.'})
        if term > 360:
            raise serializers.ValidationError({'term_periods': 'Cannot exceed 360 periods.'})
        rate = attrs.get('interest_rate_percent', Decimal('0'))
        if rate < 0:
            raise serializers.ValidationError({'interest_rate_percent': 'Cannot be negative.'})
        if rate > Decimal('36'):
            raise serializers.ValidationError({'interest_rate_percent': 'Cannot exceed 36%.'})
        return attrs
