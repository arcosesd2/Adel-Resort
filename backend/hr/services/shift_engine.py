from datetime import date

from django.db.models import Q

from hr.models import Shift, ShiftAssignment


def _end_date_filter(on_date):
    return Q(end_date__isnull=True) | Q(end_date__gte=on_date)


def get_employee_shift(employee, on_date=None):
    on_date = on_date or date.today()
    assignment = (
        ShiftAssignment.objects
        .filter(employee=employee, effective_date__lte=on_date)
        .filter(_end_date_filter(on_date))
        .order_by('-effective_date')
        .select_related('shift')
        .first()
    )
    if assignment:
        return assignment.shift
    return None


def get_employees_on_shift(shift, on_date=None):
    on_date = on_date or date.today()
    return ShiftAssignment.objects.filter(
        shift=shift,
        effective_date__lte=on_date,
    ).filter(_end_date_filter(on_date)).select_related('employee')


def is_rest_day_for_shift(on_date, shift):
    return False
