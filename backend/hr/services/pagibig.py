from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from hr.models import PagIbigRate


def _round_peso(x):
    return Decimal(x).quantize(Decimal('1'), rounding=ROUND_HALF_UP)


def compute(monthly_basic, on_date=None):
    on_date = on_date or date.today()
    rate = PagIbigRate.objects.filter(effective_from__lte=on_date).order_by('-effective_from').first()
    if rate is None:
        return {'employee': Decimal('0.00'), 'employer': Decimal('0.00')}
    salary = Decimal(monthly_basic)
    base = min(salary, rate.msc_ceiling)
    if salary <= rate.low_high_threshold:
        ee_pct = rate.ee_rate_low_percent
    else:
        ee_pct = rate.ee_rate_high_percent
    er_pct = rate.er_rate_percent
    ee = _round_peso(base * (ee_pct / Decimal('100')))
    er = _round_peso(base * (er_pct / Decimal('100')))
    return {
        'employee': Decimal(ee).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
        'employer': Decimal(er).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
    }
