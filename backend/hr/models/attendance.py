from django.conf import settings
from django.db import models


class AttendanceRecord(models.Model):
    class Source(models.TextChoices):
        WEB_CLOCK = 'web_clock', 'Web Clock-In'
        MANUAL = 'manual', 'Manual Entry'
        BULK_IMPORT = 'bulk_import', 'Bulk Import'

    employee = models.ForeignKey(
        'hr.Employee', on_delete=models.CASCADE, related_name='attendance_records',
    )
    date = models.DateField(db_index=True)
    shift = models.ForeignKey(
        'hr.Shift', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='attendance_records',
    )
    time_in = models.DateTimeField()
    time_out = models.DateTimeField(null=True, blank=True)
    hours_worked = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    night_diff_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    is_late = models.BooleanField(default=False)
    late_minutes = models.PositiveIntegerField(default=0)
    is_undertime = models.BooleanField(default=False)
    undertime_minutes = models.PositiveIntegerField(default=0)

    is_holiday = models.BooleanField(default=False)
    holiday_type = models.CharField(
        max_length=30, blank=True,
        choices=[('regular', 'Regular'), ('special_non_working', 'Special Non-Working')],
    )
    is_rest_day = models.BooleanField(default=False)

    is_approved = models.BooleanField(default=False)
    source = models.CharField(
        max_length=20, choices=Source.choices, default=Source.WEB_CLOCK,
    )
    notes = models.TextField(blank=True)
    meta = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='attendance_records_created',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='attendance_records_updated',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-time_in']
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'date'],
                name='unique_attendance_per_employee_date',
            ),
        ]
        indexes = [
            models.Index(fields=['employee', 'date']),
            models.Index(fields=['is_approved']),
        ]

    def __str__(self):
        return f'{self.employee.employee_code} - {self.date}'
