from rest_framework import serializers
from hr.models import LeaveType, LeaveBalance, LeaveRequest


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = ['id', 'name', 'code', 'is_paid', 'default_credits', 'carry_over_max', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class LeaveBalanceSerializer(serializers.ModelSerializer):
    leave_type_name = serializers.CharField(source='leave_type.name', read_only=True)
    leave_type_code = serializers.CharField(source='leave_type.code', read_only=True)
    remaining = serializers.ReadOnlyField()

    class Meta:
        model = LeaveBalance
        fields = ['id', 'employee', 'leave_type', 'leave_type_name', 'leave_type_code',
                  'year', 'total_credits', 'used', 'carried_over', 'adjusted', 'remaining']
        read_only_fields = ['id']


class LeaveBalanceWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveBalance
        fields = ['employee', 'leave_type', 'year', 'total_credits', 'carried_over', 'adjusted']


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    employee_name = serializers.SerializerMethodField()
    leave_type_name = serializers.CharField(source='leave_type.name', read_only=True)
    leave_type_code = serializers.CharField(source='leave_type.code', read_only=True)
    leave_days = serializers.SerializerMethodField()
    reviewed_by_username = serializers.CharField(source='reviewed_by.username', read_only=True, default=None)

    class Meta:
        model = LeaveRequest
        fields = [
            'id', 'employee', 'employee_code', 'employee_name',
            'leave_type', 'leave_type_name', 'leave_type_code',
            'start_date', 'end_date', 'half_day', 'reason',
            'status', 'leave_days',
            'reviewed_by', 'reviewed_by_username', 'reviewed_at', 'review_notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'reviewed_by', 'reviewed_at', 'created_at', 'updated_at']

    def get_employee_name(self, obj):
        return f'{obj.employee.user.first_name} {obj.employee.user.last_name}'.strip() or obj.employee.user.username

    def get_leave_days(self, obj):
        from hr.services.leave_engine import compute_leave_days
        return str(compute_leave_days(obj.start_date, obj.end_date, obj.half_day))


class LeaveRequestWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveRequest
        fields = ['employee', 'leave_type', 'start_date', 'end_date', 'half_day', 'reason']

    def validate(self, data):
        if data.get('end_date') and data['end_date'] < data['start_date']:
            raise serializers.ValidationError('end_date must be >= start_date.')
        return data
