from rest_framework import serializers

from hr.models import (
    PayrollPeriod, PayrollRun, Payslip, PayslipLineItem,
    SSSBracket, PhilHealthRate, PagIbigRate, BIRTaxBracket,
)


class PayrollPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollPeriod
        fields = (
            'id', 'year', 'month', 'half', 'week_number', 'cutoff_day',
            'start_date', 'end_date', 'pay_date', 'is_closed',
        )
        read_only_fields = ('id',)


class PayslipLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayslipLineItem
        fields = ('id', 'category', 'code', 'label', 'amount', 'meta')
        read_only_fields = fields


class PayslipSerializer(serializers.ModelSerializer):
    line_items = PayslipLineItemSerializer(many=True, read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    employee_name = serializers.SerializerMethodField()
    period = PayrollPeriodSerializer(source='run.period', read_only=True)

    class Meta:
        model = Payslip
        fields = (
            'id', 'payslip_number', 'run', 'employee', 'employee_code', 'employee_name',
            'compensation_snapshot', 'period',
            'days_worked', 'gross_basic', 'overtime_pay', 'holiday_pay', 'night_diff',
            'allowances_taxable', 'allowances_non_taxable', 'gross_earnings',
            'sss_ee', 'philhealth_ee', 'pagibig_ee', 'withholding_tax',
            'loan_deduction_total', 'other_deductions', 'total_deductions', 'net_pay',
            'sss_er', 'philhealth_er', 'pagibig_er', 'ec_contribution',
            'meta', 'line_items',
        )
        read_only_fields = fields

    def get_employee_name(self, obj):
        return obj.employee.user.get_full_name() if obj.employee.user else ''


class PayrollRunSerializer(serializers.ModelSerializer):
    period = PayrollPeriodSerializer(read_only=True)
    payslip_count = serializers.IntegerField(source='payslips.count', read_only=True)
    finalized_by_username = serializers.CharField(source='finalized_by.username', read_only=True, default=None)
    voided_by_username = serializers.CharField(source='voided_by.username', read_only=True, default=None)

    class Meta:
        model = PayrollRun
        fields = (
            'id', 'period', 'status', 'run_at', 'finalized_at', 'finalized_by_username',
            'voided_at', 'voided_by_username', 'void_reason', 'notes', 'payslip_count',
        )
        read_only_fields = fields


class SSSBracketSerializer(serializers.ModelSerializer):
    class Meta:
        model = SSSBracket
        fields = '__all__'


class PhilHealthRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PhilHealthRate
        fields = '__all__'


class PagIbigRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PagIbigRate
        fields = '__all__'


class BIRTaxBracketSerializer(serializers.ModelSerializer):
    class Meta:
        model = BIRTaxBracket
        fields = '__all__'
