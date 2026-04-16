from django.urls import path

from .views import employee as employee_views
from .views import contributions as contrib_views
from .views import payroll as payroll_views
from .views import loan as loan_views


urlpatterns = [
    # Employees
    path('employees/', employee_views.employee_list, name='hr-employee-list'),
    path('employees/me/', employee_views.employee_me, name='hr-employee-me'),
    path('employees/me/loans/', employee_views.employee_me_loans, name='hr-employee-me-loans'),
    path('employees/me/payslips/', employee_views.employee_me_payslips, name='hr-employee-me-payslips'),
    path('employees/<int:pk>/', employee_views.employee_detail, name='hr-employee-detail'),
    path('employees/<int:pk>/compensation/', employee_views.employee_compensation, name='hr-employee-compensation'),

    # Contribution tables
    path('tables/sss/', contrib_views.sss_list, name='hr-sss-list'),
    path('tables/sss/<int:pk>/', contrib_views.sss_detail, name='hr-sss-detail'),
    path('tables/philhealth/', contrib_views.philhealth_list, name='hr-philhealth-list'),
    path('tables/philhealth/<int:pk>/', contrib_views.philhealth_detail, name='hr-philhealth-detail'),
    path('tables/pagibig/', contrib_views.pagibig_list, name='hr-pagibig-list'),
    path('tables/pagibig/<int:pk>/', contrib_views.pagibig_detail, name='hr-pagibig-detail'),
    path('tables/bir/', contrib_views.bir_list, name='hr-bir-list'),
    path('tables/bir/<int:pk>/', contrib_views.bir_detail, name='hr-bir-detail'),
    path('tables/seed/', contrib_views.seed_tables, name='hr-tables-seed'),

    # Payroll periods
    path('periods/', payroll_views.period_list, name='hr-period-list'),
    path('periods/ensure/', payroll_views.period_ensure, name='hr-period-ensure'),
    path('periods/ensure-weekly/', payroll_views.period_ensure_weekly, name='hr-period-ensure-weekly'),

    # Payroll runs
    path('runs/', payroll_views.run_list, name='hr-run-list'),
    path('runs/<int:pk>/', payroll_views.run_detail, name='hr-run-detail'),
    path('runs/<int:pk>/finalize/', payroll_views.run_finalize, name='hr-run-finalize'),
    path('runs/<int:pk>/mark-paid/', payroll_views.run_mark_paid, name='hr-run-mark-paid'),
    path('runs/<int:pk>/void/', payroll_views.run_void, name='hr-run-void'),
    path('runs/<int:pk>/payslips/', payroll_views.run_payslips, name='hr-run-payslips'),
    path('runs/13th-month/', payroll_views.run_thirteenth_month, name='hr-run-13th-month'),

    # Payslips
    path('payslips/', payroll_views.payslip_list, name='hr-payslip-list'),
    path('payslips/<int:pk>/', payroll_views.payslip_detail, name='hr-payslip-detail'),
    path('payslips/<int:pk>/pdf/', payroll_views.payslip_pdf, name='hr-payslip-pdf'),

    # Loans
    path('loans/', loan_views.loan_list, name='hr-loan-list'),
    path('loans/<int:pk>/', loan_views.loan_detail, name='hr-loan-detail'),
    path('loans/<int:pk>/cancel/', loan_views.loan_cancel, name='hr-loan-cancel'),
    path('loans/<int:pk>/default/', loan_views.loan_default, name='hr-loan-default'),
    path('loans/<int:pk>/payments/', loan_views.loan_payments, name='hr-loan-payments'),
]
