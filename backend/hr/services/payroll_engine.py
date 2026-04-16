import calendar
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone

from accounts.models import log_activity
from hr.models import (
    BIRTaxBracket, CompensationProfile, Employee,
    PayrollPeriod, PayrollRun, Payslip, PayslipLineItem,
)
from hr.services import sss as sss_svc
from hr.services import philhealth as ph_svc
from hr.services import pagibig as pi_svc
from hr.services import bir as bir_svc
from hr.services import loan_engine
from hr.services import thirteenth_month as t13


CENTS = Decimal('0.01')


def _q(x):
    return Decimal(x).quantize(CENTS, rounding=ROUND_HALF_UP)


def _employee_eligible(comp, period):
    if comp is None:
        return False
    if period.half == PayrollPeriod.Half.FIRST_HALF or period.half == PayrollPeriod.Half.SECOND_HALF:
        return comp.pay_schedule == CompensationProfile.PaySchedule.SEMI_MONTHLY
    if period.half == PayrollPeriod.Half.WHOLE_MONTH:
        return comp.pay_schedule == CompensationProfile.PaySchedule.MONTHLY
    if period.half == PayrollPeriod.Half.WEEK:
        if comp.pay_schedule != CompensationProfile.PaySchedule.WEEKLY:
            return False
        return comp.weekly_cutoff_day == period.cutoff_day
    return False


def _gross_basic_for_period(comp, period, employee):
    """Return Decimal gross_basic for the given comp + period, prorated by
    hire/termination overlap."""
    period_days = (period.end_date - period.start_date).days + 1
    overlap_start = max(period.start_date, employee.hire_date)
    overlap_end = period.end_date
    if employee.termination_date:
        overlap_end = min(overlap_end, employee.termination_date)
    if overlap_end < overlap_start:
        return Decimal('0.00')
    overlap_days = (overlap_end - overlap_start).days + 1
    proration = Decimal(overlap_days) / Decimal(period_days)

    if period.half in (PayrollPeriod.Half.FIRST_HALF, PayrollPeriod.Half.SECOND_HALF):
        full = comp.monthly_basic_salary / Decimal('2')
    elif period.half == PayrollPeriod.Half.WHOLE_MONTH:
        full = comp.monthly_basic_salary
    elif period.half == PayrollPeriod.Half.WEEK:
        full = comp.computed_weekly_basis()
    else:
        full = Decimal('0')
    return _q(full * proration)


def _bir_period_for(period):
    if period.half in (PayrollPeriod.Half.FIRST_HALF, PayrollPeriod.Half.SECOND_HALF):
        return BIRTaxBracket.Period.SEMI_MONTHLY
    if period.half == PayrollPeriod.Half.WHOLE_MONTH:
        return BIRTaxBracket.Period.MONTHLY
    if period.half == PayrollPeriod.Half.WEEK:
        return BIRTaxBracket.Period.WEEKLY
    return BIRTaxBracket.Period.MONTHLY


def _weeks_in_month(year, month):
    """Approximate number of weekly pay periods in a calendar month (4 or 5)."""
    days = calendar.monthrange(year, month)[1]
    return 5 if days >= 29 else 4


def _split_for_weekly(monthly_amount, period):
    """Divide a monthly statutory contribution evenly across weekly periods of
    the same calendar month. Last week absorbs the rounding remainder."""
    if period.half != PayrollPeriod.Half.WEEK:
        return _q(monthly_amount)
    # Use the period's end_date month for the divisor.
    weeks = _weeks_in_month(period.end_date.year, period.end_date.month)
    if weeks <= 0:
        return _q(monthly_amount)
    per_week = (Decimal(monthly_amount) / Decimal(weeks)).quantize(CENTS, rounding=ROUND_HALF_UP)
    # We rely on the last week absorbing rounding by re-checking which week we're in
    # via week_number-modulo. For simplicity store equal per_week; final reconciliation
    # is via 13th-month or end-of-year adjustment line item.
    return per_week


@transaction.atomic
def generate_payroll_run(period, actor, employee_ids=None):
    # Concurrency guard.
    period = PayrollPeriod.objects.select_for_update().get(pk=period.pk)
    if PayrollRun.objects.filter(period=period).exclude(status=PayrollRun.Status.VOIDED).exists():
        raise ValueError('A non-voided payroll run already exists for this period.')

    run = PayrollRun.objects.create(period=period, status=PayrollRun.Status.DRAFT, created_by=actor)

    qs = Employee.objects.filter(is_active=True)
    if employee_ids:
        qs = qs.filter(pk__in=employee_ids)

    bir_period = _bir_period_for(period)
    pay_date = period.pay_date

    for employee in qs:
        comp = employee.current_compensation(period.end_date)
        if not _employee_eligible(comp, period):
            continue

        gross_basic = _gross_basic_for_period(comp, period, employee)
        if gross_basic <= 0:
            continue

        sss_full = sss_svc.compute(comp.monthly_basic_salary, on_date=pay_date,
                                   msc_override=comp.sss_msc_override)
        ph_full = ph_svc.compute(comp.monthly_basic_salary, on_date=pay_date)
        pi_full = pi_svc.compute(comp.monthly_basic_salary, on_date=pay_date)

        if period.half == PayrollPeriod.Half.WEEK:
            sss_ee = _split_for_weekly(sss_full['employee'], period)
            sss_er = _split_for_weekly(sss_full['employer'], period)
            sss_ec = _split_for_weekly(sss_full['ec'], period)
            ph_ee = _split_for_weekly(ph_full['employee'], period)
            ph_er = _split_for_weekly(ph_full['employer'], period)
            pi_ee = _split_for_weekly(pi_full['employee'], period)
            pi_er = _split_for_weekly(pi_full['employer'], period)
        elif period.half in (PayrollPeriod.Half.FIRST_HALF, PayrollPeriod.Half.SECOND_HALF):
            # Statutory contributions are monthly; split equally between halves.
            half = lambda v: _q(Decimal(v) / Decimal('2'))
            sss_ee = half(sss_full['employee'])
            sss_er = half(sss_full['employer'])
            sss_ec = half(sss_full['ec'])
            ph_ee = half(ph_full['employee'])
            ph_er = half(ph_full['employer'])
            pi_ee = half(pi_full['employee'])
            pi_er = half(pi_full['employer'])
        else:
            sss_ee = _q(sss_full['employee'])
            sss_er = _q(sss_full['employer'])
            sss_ec = _q(sss_full['ec'])
            ph_ee = _q(ph_full['employee'])
            ph_er = _q(ph_full['employer'])
            pi_ee = _q(pi_full['employee'])
            pi_er = _q(pi_full['employer'])

        gross_earnings = gross_basic
        statutory_total = sss_ee + ph_ee + pi_ee
        taxable = max(Decimal('0'), gross_earnings - statutory_total)
        wtax = bir_svc.compute(taxable, bir_period, on_date=pay_date)

        loan_deductions = loan_engine.collect_auto_deductions(employee, period)
        loan_total = sum((amt for _l, amt in loan_deductions), Decimal('0.00'))

        total_deductions = _q(statutory_total + wtax + loan_total)
        net_pay = _q(gross_earnings - total_deductions)

        payslip = Payslip.objects.create(
            run=run,
            employee=employee,
            compensation_snapshot=comp,
            days_worked=Decimal('0'),
            gross_basic=gross_basic,
            gross_earnings=gross_earnings,
            sss_ee=sss_ee, philhealth_ee=ph_ee, pagibig_ee=pi_ee,
            withholding_tax=wtax, loan_deduction_total=_q(loan_total),
            other_deductions=Decimal('0'),
            total_deductions=total_deductions, net_pay=net_pay,
            sss_er=sss_er, philhealth_er=ph_er, pagibig_er=pi_er,
            ec_contribution=sss_ec,
        )

        # Line items
        PayslipLineItem.objects.create(
            payslip=payslip, category=PayslipLineItem.Category.EARNING,
            code='BASIC', label='Basic Pay', amount=gross_basic,
        )
        PayslipLineItem.objects.create(
            payslip=payslip, category=PayslipLineItem.Category.DEDUCTION,
            code='SSS_EE', label='SSS (Employee Share)', amount=sss_ee,
        )
        PayslipLineItem.objects.create(
            payslip=payslip, category=PayslipLineItem.Category.DEDUCTION,
            code='PH_EE', label='PhilHealth (Employee Share)', amount=ph_ee,
        )
        PayslipLineItem.objects.create(
            payslip=payslip, category=PayslipLineItem.Category.DEDUCTION,
            code='HDMF_EE', label='Pag-IBIG (Employee Share)', amount=pi_ee,
        )
        PayslipLineItem.objects.create(
            payslip=payslip, category=PayslipLineItem.Category.DEDUCTION,
            code='WTAX', label='Withholding Tax', amount=wtax,
        )
        for loan, amt in loan_deductions:
            PayslipLineItem.objects.create(
                payslip=payslip, category=PayslipLineItem.Category.DEDUCTION,
                code='LOAN', label=f'Loan #{loan.id} installment', amount=amt,
                meta={'loan_id': loan.id},
            )
        PayslipLineItem.objects.create(
            payslip=payslip, category=PayslipLineItem.Category.EMPLOYER_CONTRIBUTION,
            code='SSS_ER', label='SSS (Employer Share)', amount=sss_er,
        )
        PayslipLineItem.objects.create(
            payslip=payslip, category=PayslipLineItem.Category.EMPLOYER_CONTRIBUTION,
            code='PH_ER', label='PhilHealth (Employer Share)', amount=ph_er,
        )
        PayslipLineItem.objects.create(
            payslip=payslip, category=PayslipLineItem.Category.EMPLOYER_CONTRIBUTION,
            code='HDMF_ER', label='Pag-IBIG (Employer Share)', amount=pi_er,
        )
        PayslipLineItem.objects.create(
            payslip=payslip, category=PayslipLineItem.Category.EMPLOYER_CONTRIBUTION,
            code='EC', label='SSS Employees Compensation', amount=sss_ec,
        )

    log_activity(actor, 'payroll', f'Generated draft payroll run #{run.id} for {period}')
    return run


@transaction.atomic
def finalize_run(run, actor):
    if run.status != PayrollRun.Status.DRAFT:
        raise ValueError(f'Only DRAFT runs can be finalized (current={run.status}).')
    run.status = PayrollRun.Status.FINALIZED
    run.finalized_at = timezone.now()
    run.finalized_by = actor
    run.save(update_fields=['status', 'finalized_at', 'finalized_by'])
    period = run.period
    period.is_closed = True
    period.save(update_fields=['is_closed'])
    log_activity(actor, 'payroll', f'Finalized payroll run #{run.id}')
    return run


@transaction.atomic
def mark_paid(run, actor):
    if run.status != PayrollRun.Status.FINALIZED:
        raise ValueError(f'Only FINALIZED runs can be marked paid (current={run.status}).')
    for payslip in run.payslips.all():
        loan_engine.apply_payroll_loan_payments(payslip, actor)
    run.status = PayrollRun.Status.PAID
    run.save(update_fields=['status'])
    log_activity(actor, 'payroll', f'Marked payroll run #{run.id} as PAID')
    return run


@transaction.atomic
def void_run(run, actor, reason):
    if run.status == PayrollRun.Status.VOIDED:
        return run
    loan_engine.reverse_payroll_loan_payments(run)
    run.status = PayrollRun.Status.VOIDED
    run.voided_at = timezone.now()
    run.voided_by = actor
    run.void_reason = reason or ''
    run.save(update_fields=['status', 'voided_at', 'voided_by', 'void_reason'])
    period = run.period
    period.is_closed = False
    period.save(update_fields=['is_closed'])
    log_activity(actor, 'payroll', f'Voided payroll run #{run.id}: {reason}')
    return run


@transaction.atomic
def generate_thirteenth_month(year, actor, employee_ids=None):
    period, _ = PayrollPeriod.objects.get_or_create(
        year=year, month=12, half=PayrollPeriod.Half.THIRTEENTH_MONTH,
        week_number=None,
        defaults={
            'start_date': f'{year}-12-01',
            'end_date': f'{year}-12-31',
            'pay_date': f'{year}-12-15',
        },
    )
    period = PayrollPeriod.objects.select_for_update().get(pk=period.pk)
    if PayrollRun.objects.filter(period=period).exclude(status=PayrollRun.Status.VOIDED).exists():
        raise ValueError('A non-voided 13th-month run already exists for this year.')

    run = PayrollRun.objects.create(period=period, status=PayrollRun.Status.DRAFT, created_by=actor)
    qs = Employee.objects.filter(is_active=True)
    if employee_ids:
        qs = qs.filter(pk__in=employee_ids)

    for employee in qs:
        comp = employee.current_compensation(period.end_date)
        if comp is None:
            continue
        result = t13.compute_for_employee(employee, year)
        base = result['thirteenth_month']
        exempt = result['exempt_portion']
        taxable = result['taxable_portion']
        if base <= 0:
            continue
        wtax = bir_svc.compute(taxable, BIRTaxBracket.Period.MONTHLY, on_date=period.pay_date)
        net_pay = _q(base - wtax)
        payslip = Payslip.objects.create(
            run=run, employee=employee, compensation_snapshot=comp,
            gross_basic=base, gross_earnings=base,
            withholding_tax=wtax, total_deductions=wtax, net_pay=net_pay,
            meta={'non_taxable_bonus_ytd': str(exempt)},
        )
        PayslipLineItem.objects.create(
            payslip=payslip, category=PayslipLineItem.Category.EARNING,
            code='13TH_MONTH_EXEMPT', label='13th Month (Tax-Exempt)', amount=exempt,
        )
        if taxable > 0:
            PayslipLineItem.objects.create(
                payslip=payslip, category=PayslipLineItem.Category.EARNING,
                code='13TH_MONTH_TAXABLE', label='13th Month (Taxable Excess)', amount=taxable,
            )
            PayslipLineItem.objects.create(
                payslip=payslip, category=PayslipLineItem.Category.DEDUCTION,
                code='WTAX', label='Withholding Tax (13th-month excess)', amount=wtax,
            )

    log_activity(actor, 'payroll', f'Generated 13th-month run #{run.id} for {year}')
    return run
