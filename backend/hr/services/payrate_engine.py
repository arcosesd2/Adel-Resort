from decimal import Decimal, ROUND_HALF_UP

from hr.models import PayRateConfig


CENTS = Decimal('0.01')


def _q(x):
    return Decimal(x).quantize(CENTS, rounding=ROUND_HALF_UP)


def get_effective_config(on_date):
    config = (
        PayRateConfig.objects
        .filter(effective_from__lte=on_date)
        .order_by('-effective_from')
        .first()
    )
    if config is None:
        config = PayRateConfig.objects.create(
            effective_from=on_date,
        )
    return config


def compute_overtime_pay(overtime_hours, hourly_rate, is_rest_day, is_holiday, holiday_type, on_date):
    config = get_effective_config(on_date)
    rate_pct = config.ot_rate(is_rest_day, is_holiday, holiday_type)
    premium_pct = rate_pct - Decimal('100')
    return _q(hourly_rate * overtime_hours * premium_pct / Decimal('100'))


def compute_holiday_or_rest_day_pay(hours, daily_rate, hourly_rate, is_rest_day, is_holiday, holiday_type, on_date):
    config = get_effective_config(on_date)
    day_rate_pct = config.day_rate(is_rest_day, is_holiday, holiday_type)
    if day_rate_pct is None:
        return Decimal('0'), Decimal('0')
    premium_pct = day_rate_pct - Decimal('100')
    premium_amount = _q(hourly_rate * hours * premium_pct / Decimal('100'))
    holiday_pay = Decimal('0')
    rest_day_pay = Decimal('0')
    if is_holiday:
        holiday_pay = premium_amount
    elif is_rest_day:
        rest_day_pay = premium_amount
    return holiday_pay, rest_day_pay


def compute_night_diff_pay(night_diff_hours, hourly_rate, is_rest_day, is_holiday, on_date):
    config = get_effective_config(on_date)
    nd_pct = config.night_diff_pct(is_rest_day, is_holiday)
    return _q(hourly_rate * night_diff_hours * nd_pct / Decimal('100'))


def compute_late_deduction(late_minutes, hourly_rate, on_date):
    config = get_effective_config(on_date)
    per_minute = hourly_rate / Decimal('60') / Decimal('8')
    base_deduction = per_minute * Decimal(str(late_minutes))
    return _q(base_deduction * config.late_deduction_multiplier_pct / Decimal('100'))


def compute_undertime_deduction(undertime_minutes, hourly_rate, on_date):
    config = get_effective_config(on_date)
    per_minute = hourly_rate / Decimal('60') / Decimal('8')
    base_deduction = per_minute * Decimal(str(undertime_minutes))
    return _q(base_deduction * config.undertime_deduction_multiplier_pct / Decimal('100'))
