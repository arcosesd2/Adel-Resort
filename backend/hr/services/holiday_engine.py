from datetime import date

from django.utils import timezone

from hr.models import Holiday


def is_holiday(on_date):
    try:
        return Holiday.objects.get(date=on_date)
    except Holiday.DoesNotExist:
        return None


def get_holiday_type(on_date):
    h = is_holiday(on_date)
    if h is None:
        return None, False
    return h.holiday_type, True


def get_holidays_in_range(start_date, end_date):
    return Holiday.objects.filter(date__gte=start_date, date__lte=end_date).order_by('date')


def get_recurring_for_date(on_date):
    return Holiday.objects.filter(
        is_recurring=True,
        date__month=on_date.month,
        date__day=on_date.day,
    ).exclude(date=on_date)
