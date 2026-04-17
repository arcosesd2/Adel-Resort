from django.urls import path

from .views import employee as employee_views
from .views import contributions as contrib_views
from .views import payroll as payroll_views
from .views import loan as loan_views
from .views import payrate_config as prc_views
from .views import holiday as holiday_views
from .views import shift as shift_views
from .views import attendance as attendance_views
from .views import leave as leave_views


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

    # Pay rate config
    path('payrate-config/', prc_views.config_list, name='hr-payrate-config-list'),
    path('payrate-config/current/', prc_views.config_current, name='hr-payrate-config-current'),
    path('payrate-config/<int:pk>/', prc_views.config_detail, name='hr-payrate-config-detail'),

    # Holidays
    path('holidays/', holiday_views.holiday_list, name='hr-holiday-list'),
    path('holidays/<int:pk>/', holiday_views.holiday_detail, name='hr-holiday-detail'),

    # Shifts
    path('shifts/', shift_views.shift_list, name='hr-shift-list'),
    path('shifts/<int:pk>/', shift_views.shift_detail, name='hr-shift-detail'),
    path('shift-assignments/', shift_views.assignment_list, name='hr-shift-assignment-list'),
    path('shift-assignments/<int:pk>/', shift_views.assignment_detail, name='hr-shift-assignment-detail'),

    # Attendance
    path('attendance/records/', attendance_views.record_list, name='hr-attendance-list'),
    path('attendance/records/<int:pk>/', attendance_views.record_detail, name='hr-attendance-detail'),
    path('attendance/records/<int:pk>/approve/', attendance_views.approve_record, name='hr-attendance-approve'),
    path('attendance/records/bulk-approve/', attendance_views.bulk_approve, name='hr-attendance-bulk-approve'),
    path('attendance/clock-in/', attendance_views.clock_in, name='hr-attendance-clock-in'),
    path('attendance/clock-out/', attendance_views.clock_out, name='hr-attendance-clock-out'),
    path('attendance/my-records/', attendance_views.my_records, name='hr-attendance-my-records'),
    path('attendance/my-summary/', attendance_views.my_summary, name='hr-attendance-my-summary'),
    path('attendance/summary/', attendance_views.attendance_summary, name='hr-attendance-summary'),
    path('attendance/payroll-preview/', attendance_views.payroll_preview, name='hr-attendance-payroll-preview'),

    # Leave
    path('leave/types/', leave_views.leave_type_list, name='hr-leave-type-list'),
    path('leave/types/<int:pk>/', leave_views.leave_type_detail, name='hr-leave-type-detail'),
    path('leave/balances/', leave_views.leave_balance_list, name='hr-leave-balance-list'),
    path('leave/balances/<int:pk>/', leave_views.leave_balance_detail, name='hr-leave-balance-detail'),
    path('leave/balances/initialize/', leave_views.leave_balance_initialize, name='hr-leave-balance-initialize'),
    path('leave/requests/', leave_views.leave_request_list_admin, name='hr-leave-request-list'),
    path('leave/requests/<int:pk>/approve/', leave_views.leave_request_approve, name='hr-leave-request-approve'),
    path('leave/requests/<int:pk>/reject/', leave_views.leave_request_reject, name='hr-leave-request-reject'),
    path('leave/requests/<int:pk>/cancel/', leave_views.leave_request_cancel, name='hr-leave-request-cancel'),
    path('leave/my-requests/', leave_views.leave_request_list_employee, name='hr-leave-my-requests'),
    path('leave/my-balances/', leave_views.my_leave_balances, name='hr-leave-my-balances'),

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
