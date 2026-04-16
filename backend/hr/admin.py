from django.contrib import admin

from .models import (
    Employee, CompensationProfile,
    SSSBracket, PhilHealthRate, PagIbigRate, BIRTaxBracket,
    PayrollPeriod, PayrollRun, Payslip, PayslipLineItem,
    Loan, LoanPayment,
)


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('employee_code', 'user', 'position', 'department', 'employment_status', 'is_active')
    list_filter = ('employment_status', 'is_active', 'department')
    search_fields = ('employee_code', 'user__username', 'user__first_name', 'user__last_name', 'tin')


@admin.register(CompensationProfile)
class CompensationProfileAdmin(admin.ModelAdmin):
    list_display = ('employee', 'effective_date', 'monthly_basic_salary', 'pay_schedule')
    list_filter = ('pay_schedule',)
    search_fields = ('employee__employee_code',)


@admin.register(SSSBracket)
class SSSBracketAdmin(admin.ModelAdmin):
    list_display = ('range_from', 'range_to', 'msc', 'ee_contribution', 'er_contribution', 'effective_from')
    list_filter = ('effective_from',)


@admin.register(PhilHealthRate)
class PhilHealthRateAdmin(admin.ModelAdmin):
    list_display = ('effective_from', 'premium_rate_percent', 'salary_floor', 'salary_ceiling')


@admin.register(PagIbigRate)
class PagIbigRateAdmin(admin.ModelAdmin):
    list_display = ('effective_from', 'ee_rate_low_percent', 'ee_rate_high_percent', 'er_rate_percent', 'msc_ceiling')


@admin.register(BIRTaxBracket)
class BIRTaxBracketAdmin(admin.ModelAdmin):
    list_display = ('effective_from', 'period', 'range_from', 'range_to', 'base_tax', 'rate_on_excess_percent')
    list_filter = ('period', 'effective_from')


@admin.register(PayrollPeriod)
class PayrollPeriodAdmin(admin.ModelAdmin):
    list_display = ('year', 'month', 'half', 'week_number', 'start_date', 'end_date', 'pay_date', 'is_closed')
    list_filter = ('year', 'half', 'is_closed')


@admin.register(PayrollRun)
class PayrollRunAdmin(admin.ModelAdmin):
    list_display = ('id', 'period', 'status', 'run_at', 'finalized_at', 'voided_at')
    list_filter = ('status',)


class PayslipLineItemInline(admin.TabularInline):
    model = PayslipLineItem
    extra = 0


@admin.register(Payslip)
class PayslipAdmin(admin.ModelAdmin):
    list_display = ('payslip_number', 'employee', 'run', 'gross_earnings', 'total_deductions', 'net_pay')
    search_fields = ('payslip_number', 'employee__employee_code')
    inlines = [PayslipLineItemInline]


@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    list_display = ('id', 'employee', 'principal', 'installment_amount', 'status', 'auto_deduct', 'start_date')
    list_filter = ('status', 'auto_deduct', 'interest_method')
    search_fields = ('employee__employee_code', 'purpose')


@admin.register(LoanPayment)
class LoanPaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'loan', 'amount', 'source', 'payment_date', 'payslip')
    list_filter = ('source',)
