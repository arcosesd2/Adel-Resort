from rest_framework import serializers
from hr.models import Shift, ShiftAssignment


class ShiftSerializer(serializers.ModelSerializer):
    work_hours = serializers.ReadOnlyField()

    class Meta:
        model = Shift
        fields = ['id', 'name', 'code', 'start_time', 'end_time', 'break_minutes',
                  'grace_period_minutes', 'is_night_shift', 'is_active', 'color', 'work_hours', 'created_at']
        read_only_fields = ['id', 'created_at']


class ShiftAssignmentSerializer(serializers.ModelSerializer):
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    employee_name = serializers.SerializerMethodField()
    shift_name = serializers.CharField(source='shift.name', read_only=True)
    shift_code = serializers.CharField(source='shift.code', read_only=True)
    is_current = serializers.ReadOnlyField()

    class Meta:
        model = ShiftAssignment
        fields = ['id', 'employee', 'employee_code', 'employee_name',
                  'shift', 'shift_code', 'shift_name',
                  'effective_date', 'end_date', 'is_current', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_employee_name(self, obj):
        return f'{obj.employee.user.first_name} {obj.employee.user.last_name}'.strip() or obj.employee.user.username


class ShiftAssignmentWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShiftAssignment
        fields = ['employee', 'shift', 'effective_date', 'end_date']
