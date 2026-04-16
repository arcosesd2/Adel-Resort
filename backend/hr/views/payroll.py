from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import FileResponse

from accounts.permissions import IsAdminOrSuperAdmin

from hr.models import PayrollPeriod, PayrollRun, Payslip
from hr.serializers import (
    PayrollPeriodSerializer, PayrollRunSerializer, PayslipSerializer,
)
from hr.services import payroll_engine


@api_view(['GET'])
@permission_classes([IsAdminOrSuperAdmin])
def period_list(request):
    qs = PayrollPeriod.objects.all()
    year = request.query_params.get('year')
    if year:
        qs = qs.filter(year=int(year))
    schedule = request.query_params.get('schedule')
    if schedule == 'SEMI_MONTHLY':
        qs = qs.filter(half__in=[PayrollPeriod.Half.FIRST_HALF, PayrollPeriod.Half.SECOND_HALF])
    elif schedule == 'MONTHLY':
        qs = qs.filter(half=PayrollPeriod.Half.WHOLE_MONTH)
    elif schedule == 'WEEKLY':
        qs = qs.filter(half=PayrollPeriod.Half.WEEK)
    cutoff = request.query_params.get('cutoff_day')
    if cutoff:
        qs = qs.filter(cutoff_day=int(cutoff))
    return Response(PayrollPeriodSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdminOrSuperAdmin])
def period_ensure(request):
    year = int(request.data.get('year'))
    PayrollPeriod.ensure_for_year(year)
    # Also ensure weekly periods for any cutoff_day in active comp profiles.
    from hr.models import CompensationProfile
    cutoff_days = (
        CompensationProfile.objects
        .filter(pay_schedule=CompensationProfile.PaySchedule.WEEKLY)
        .values_list('weekly_cutoff_day', flat=True)
        .distinct()
    )
    for cd in cutoff_days:
        if cd:
            PayrollPeriod.ensure_weekly_periods(year, cd)
    qs = PayrollPeriod.objects.filter(year=year)
    return Response(PayrollPeriodSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdminOrSuperAdmin])
def period_ensure_weekly(request):
    year = int(request.data.get('year'))
    cutoff_day = int(request.data.get('cutoff_day'))
    PayrollPeriod.ensure_weekly_periods(year, cutoff_day)
    qs = PayrollPeriod.objects.filter(year=year, half=PayrollPeriod.Half.WEEK, cutoff_day=cutoff_day)
    return Response(PayrollPeriodSerializer(qs, many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrSuperAdmin])
def run_list(request):
    if request.method == 'GET':
        qs = PayrollRun.objects.select_related('period').all()
        period_id = request.query_params.get('period')
        if period_id:
            qs = qs.filter(period_id=period_id)
        st = request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)
        return Response(PayrollRunSerializer(qs, many=True).data)

    period_id = request.data.get('period_id')
    employee_ids = request.data.get('employee_ids') or None
    try:
        period = PayrollPeriod.objects.get(pk=period_id)
    except PayrollPeriod.DoesNotExist:
        return Response({'detail': 'Period not found.'}, status=status.HTTP_404_NOT_FOUND)
    try:
        run = payroll_engine.generate_payroll_run(period, request.user, employee_ids)
    except ValueError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(PayrollRunSerializer(run).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAdminOrSuperAdmin])
def run_detail(request, pk):
    try:
        run = PayrollRun.objects.select_related('period').get(pk=pk)
    except PayrollRun.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(PayrollRunSerializer(run).data)


@api_view(['POST'])
@permission_classes([IsAdminOrSuperAdmin])
def run_finalize(request, pk):
    try:
        run = PayrollRun.objects.get(pk=pk)
    except PayrollRun.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    try:
        run = payroll_engine.finalize_run(run, request.user)
    except ValueError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(PayrollRunSerializer(run).data)


@api_view(['POST'])
@permission_classes([IsAdminOrSuperAdmin])
def run_mark_paid(request, pk):
    try:
        run = PayrollRun.objects.get(pk=pk)
    except PayrollRun.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    try:
        run = payroll_engine.mark_paid(run, request.user)
    except ValueError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(PayrollRunSerializer(run).data)


@api_view(['POST'])
@permission_classes([IsAdminOrSuperAdmin])
def run_void(request, pk):
    try:
        run = PayrollRun.objects.get(pk=pk)
    except PayrollRun.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    reason = request.data.get('reason', '')
    run = payroll_engine.void_run(run, request.user, reason)
    return Response(PayrollRunSerializer(run).data)


@api_view(['GET'])
@permission_classes([IsAdminOrSuperAdmin])
def run_payslips(request, pk):
    qs = Payslip.objects.filter(run_id=pk).select_related('employee', 'employee__user', 'run__period').prefetch_related('line_items')
    return Response(PayslipSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdminOrSuperAdmin])
def run_thirteenth_month(request):
    year = int(request.data.get('year'))
    employee_ids = request.data.get('employee_ids') or None
    try:
        run = payroll_engine.generate_thirteenth_month(year, request.user, employee_ids)
    except ValueError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(PayrollRunSerializer(run).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAdminOrSuperAdmin])
def payslip_list(request):
    qs = Payslip.objects.select_related('run', 'run__period', 'employee', 'employee__user').prefetch_related('line_items')
    employee = request.query_params.get('employee')
    if employee:
        qs = qs.filter(employee_id=employee)
    run = request.query_params.get('run')
    if run:
        qs = qs.filter(run_id=run)
    period = request.query_params.get('period')
    if period:
        qs = qs.filter(run__period_id=period)
    return Response(PayslipSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payslip_detail(request, pk):
    try:
        ps = Payslip.objects.select_related('run', 'run__period', 'employee', 'employee__user').prefetch_related('line_items').get(pk=pk)
    except Payslip.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    u = request.user
    if not (u.is_superadmin or getattr(u, 'is_admin', False) or ps.employee.user_id == u.id):
        return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
    return Response(PayslipSerializer(ps).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payslip_pdf(request, pk):
    try:
        ps = Payslip.objects.select_related('run', 'run__period', 'employee', 'employee__user').prefetch_related('line_items').get(pk=pk)
    except Payslip.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    u = request.user
    if not (u.is_superadmin or getattr(u, 'is_admin', False) or ps.employee.user_id == u.id):
        return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
    from hr.pdf import generate_payslip_pdf
    buf = generate_payslip_pdf(ps)
    return FileResponse(buf, as_attachment=True, filename=f'{ps.payslip_number}.pdf', content_type='application/pdf')
