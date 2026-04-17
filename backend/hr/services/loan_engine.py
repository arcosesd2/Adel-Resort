from decimal import Decimal

from hr.models import Loan, LoanPayment


def collect_auto_deductions(employee, period):
    """Return list of (loan, deduct_amount Decimal) for the given period.

    Loans whose start_date is after the period's start are skipped — they begin
    deducting from the next period.
    """
    qs = Loan.objects.filter(
        employee=employee,
        status=Loan.Status.ACTIVE,
        auto_deduct=True,
        start_date__lte=period.start_date,
    )
    out = []
    for loan in qs:
        balance = loan.remaining_balance
        if balance <= 0:
            continue
        deduct = min(loan.installment_amount, balance)
        if deduct > 0:
            out.append((loan, deduct.quantize(Decimal('0.01'))))
    return out


def apply_payroll_loan_payments(payslip, actor):
    """Called from payroll_engine.mark_paid(). For every LOAN line item on the
    payslip, create a LoanPayment row and transition status if balance hits 0."""
    from hr.models import PayslipLineItem
    from django.utils import timezone

    line_items = payslip.line_items.filter(category=PayslipLineItem.Category.DEDUCTION, code='LOAN')
    for item in line_items:
        loan_id = (item.meta or {}).get('loan_id')
        if not loan_id:
            continue
        try:
            loan = Loan.objects.select_for_update().get(pk=loan_id)
        except Loan.DoesNotExist:
            continue
        LoanPayment.objects.create(
            loan=loan,
            amount=item.amount,
            payment_date=payslip.run.period.pay_date,
            source=Loan.Source.PAYROLL_DEDUCTION,
            payslip=payslip,
            recorded_by=actor,
            notes=f'Auto-deduction from payslip {payslip.payslip_number}',
        )
        if loan.remaining_balance <= 0:
            loan.status = Loan.Status.PAID_OFF
            loan.paid_off_at = timezone.now()
            loan.save(update_fields=['status', 'paid_off_at', 'updated_at'])


def reverse_payroll_loan_payments(run):
    """Called from payroll_engine.void_run(). Soft-delete LoanPayment rows linked
    to payslips of this run; revert PAID_OFF loans back to ACTIVE if their
    balance is restored above zero."""
    affected_loan_ids = set()
    for payslip in run.payslips.all():
        for lp in payslip.loan_payments.filter(source=Loan.Source.PAYROLL_DEDUCTION, is_voided=False):
            affected_loan_ids.add(lp.loan_id)
            lp.is_voided = True
            lp.save(update_fields=['is_voided'])
    for loan in Loan.objects.filter(pk__in=affected_loan_ids):
        if loan.status == Loan.Status.PAID_OFF and loan.remaining_balance > 0:
            loan.status = Loan.Status.ACTIVE
            loan.paid_off_at = None
            loan.save(update_fields=['status', 'paid_off_at', 'updated_at'])
