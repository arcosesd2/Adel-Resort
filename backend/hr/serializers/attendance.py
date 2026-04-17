from rest_framework import serializers
from hr.models import AttendanceRecord


class AttendanceRecordSerializer(serializers.ModelSerializer):
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    employee_name = serializers.SerializerMethodField()
    shift_name = serializers.CharField(source='shift.name', read_only=True, default=None)

    class Meta:
        model = AttendanceRecord
        fields = [
            'id', 'employee', 'employee_code', 'employee_name',
            'date', 'shift', 'shift_name',
            'time_in', 'time_out',
            'hours_worked', 'overtime_hours', 'night_diff_hours',
            'is_late', 'late_minutes', 'is_undertime', 'undertime_minutes',
            'is_holiday', 'holiday_type', 'is_rest_day',
            'is_approved', 'source', 'notes', 'meta',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'employee_code', 'employee_name', 'shift_name',
            'hours_worked', 'overtime_hours', 'night_diff_hours',
            'is_late', 'late_minutes', 'is_undertime', 'undertime_minutes',
            'is_holiday', 'holiday_type', 'is_rest_day',
            'created_at', 'updated_at',
        ]

    def get_employee_name(self, obj):
        return f'{obj.employee.user.first_name} {obj.employee.user.last_name}'.strip() or obj.employee.user.username


class AttendanceRecordWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRecord
        fields = [
            'employee', 'date', 'shift', 'time_in', 'time_out',
            'is_approved', 'source', 'notes', 'meta',
        ]

    def validate(self, data):
        if data.get('time_out') and data['time_out'] <= data['time_in']:
            raise serializers.ValidationError('time_out must be after time_in.')
        return data


class AttendanceSummarySerializer(serializers.Serializer):
    has_attendance_data = serializers.BooleanField()
    days_worked = serializers.DecimalField(max_digits=5, decimal_places=2)
    overtime_pay = serializers.DecimalField(max_digits=12, decimal_places=2)
    holiday_pay = serializers.DecimalField(max_digits=12, decimal_places=2)
    rest_day_pay = serializers.DecimalField(max_digits=12, decimal_places=2)
    night_diff_pay = serializers.DecimalField(max_digits=12, decimal_places=2)
    late_deduction = serializers.DecimalField(max_digits=12, decimal_places=2)
    undertime_deduction = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_overtime_hours = serializers.DecimalField(max_digits=5, decimal_places=2)
    total_night_diff_hours = serializers.DecimalField(max_digits=5, decimal_places=2)


class ClockInSerializer(serializers.Serializer):
    pass


class ClockOutSerializer(serializers.Serializer):
    pass
