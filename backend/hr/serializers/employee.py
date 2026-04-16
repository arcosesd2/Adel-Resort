from rest_framework import serializers

from hr.models import Employee, CompensationProfile


class CompensationProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompensationProfile
        fields = (
            'id', 'employee', 'effective_date', 'monthly_basic_salary', 'pay_schedule',
            'weekly_cutoff_day', 'weekly_basis', 'sss_msc_override', 'tax_status',
            'daily_rate', 'hourly_rate', 'created_by', 'created_at',
        )
        read_only_fields = ('id', 'employee', 'created_by', 'created_at')

    def validate(self, attrs):
        sched = attrs.get('pay_schedule')
        cutoff = attrs.get('weekly_cutoff_day')
        if sched == CompensationProfile.PaySchedule.WEEKLY and not cutoff:
            raise serializers.ValidationError({'weekly_cutoff_day': 'Required when pay_schedule=WEEKLY.'})
        if sched != CompensationProfile.PaySchedule.WEEKLY and cutoff:
            raise serializers.ValidationError({'weekly_cutoff_day': 'Only allowed when pay_schedule=WEEKLY.'})
        return attrs


class EmployeeSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_full_name = serializers.SerializerMethodField()
    user_email = serializers.CharField(source='user.email', read_only=True)
    current_compensation = serializers.SerializerMethodField()
    active_loans_count = serializers.SerializerMethodField()
    total_outstanding_loan = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = (
            'id', 'user', 'user_username', 'user_full_name', 'user_email',
            'employee_code', 'tin', 'sss_number', 'philhealth_number', 'pagibig_number',
            'hire_date', 'termination_date', 'employment_status', 'position', 'department',
            'is_active', 'created_at', 'updated_at',
            'current_compensation', 'active_loans_count', 'total_outstanding_loan',
        )
        read_only_fields = ('id', 'employee_code', 'created_at', 'updated_at')

    def get_user_full_name(self, obj):
        return obj.user.get_full_name() if obj.user else ''

    def get_current_compensation(self, obj):
        c = obj.current_compensation()
        return CompensationProfileSerializer(c).data if c else None

    def get_active_loans_count(self, obj):
        return obj.loans.filter(status='active').count()

    def get_total_outstanding_loan(self, obj):
        from decimal import Decimal
        total = Decimal('0')
        for loan in obj.loans.filter(status='active'):
            total += loan.remaining_balance
        return str(total.quantize(Decimal('0.01')))


class EmployeeWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = (
            'user', 'tin', 'sss_number', 'philhealth_number', 'pagibig_number',
            'hire_date', 'termination_date', 'employment_status', 'position', 'department',
            'is_active',
        )
