from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from hr.models import BIRTaxBracket


def compute(taxable_amount, period, on_date=None):
    """Compute withholding tax for the given taxable amount and BIR period type.

    period: one of BIRTaxBracket.Period values
    """
    on_date = on_date or date.today()
    taxable = Decimal(taxable_amount)
    if taxable <= 0:
        return Decimal('0.00')
    latest_eff = (
        BIRTaxBracket.objects
        .filter(period=period, effective_from__lte=on_date)
        .order_by('-effective_from')
        .values_list('effective_from', flat=True)
        .first()
    )
    if latest_eff is None:
        return Decimal('0.00')
    brackets = (
        BIRTaxBracket.objects
        .filter(period=period, effective_from=latest_eff)
        .order_by('range_from')
    )
    bracket = None
    for b in brackets:
        if b.range_to is None and taxable >= b.range_from:
            bracket = b
            break
        if b.range_from <= taxable <= (b.range_to or taxable):
            bracket = b
            break
    if bracket is None:
        bracket = brackets.last()
    if bracket is None:
        return Decimal('0.00')
    excess = max(Decimal('0'), taxable - bracket.excess_over)
    tax = bracket.base_tax + (excess * (bracket.rate_on_excess_percent / Decimal('100')))
    return tax.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
