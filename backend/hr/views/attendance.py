from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAdminOrSuperAdmin
from hr.models import AttendanceRecord, Employee
from hr.services import attendance_engine
from hr.services import shift_engine
from hr.serializers.attendance import (
    AttendanceRecordSerializer, AttendanceRecordWriteSerializer,
    AttendanceSummarySerializer,
)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrSuperAdmin])
def record_list(request):
    if request.method == 'GET':
        qs = AttendanceRecord.objects.select_related(
            'employee', 'employee__user', 'shift',
        )
        employee = request.query_params.get('employee')
        if employee:
            qs = qs.filter(employee_id=int(employee))
        date_from = request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        date_to = request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(date__lte=date_to)
        is_approved = request.query_params.get('is_approved')
        if is_approved is not None:
            qs = qs.filter(is_approved=is_approved.lower() == 'true')
        source = request.query_params.get('source')
        if source:
            qs = qs.filter(source=source)
        qs = qs[:500]
        return Response(AttendanceRecordSerializer(qs, many=True).data)

    serializer = AttendanceRecordWriteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    record = serializer.save(source='manual', created_by=request.user, updated_by=request.user)
    attendance_engine.auto_compute(record)
    record.save()
    return Response(AttendanceRecordSerializer(record).data, status=201)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminOrSuperAdmin])
def record_detail(request, pk):
    record = AttendanceRecord.objects.select_related('employee', 'employee__user', 'shift').get(pk=pk)
    if request.method == 'GET':
        return Response(AttendanceRecordSerializer(record).data)
    if request.method == 'DELETE':
        record.delete()
        return Response(status=204)
    serializer = AttendanceRecordWriteSerializer(record, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    record = serializer.save(updated_by=request.user)
    attendance_engine.auto_compute(record)
    record.save()
    return Response(AttendanceRecordSerializer(record).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clock_in(request):
    try:
        employee = Employee.objects.get(user=request.user, is_active=True)
    except Employee.DoesNotExist:
        return Response({'detail': 'No active employee profile.'}, status=400)

    now = timezone.now()
    today = now.date()

    existing = AttendanceRecord.objects.filter(employee=employee, date=today).first()
    if existing and existing.time_out is None:
        return Response({'detail': 'Already clocked in today.'}, status=400)
    if existing and existing.time_out is not None:
        return Response({'detail': 'Already completed attendance for today.'}, status=400)

    shift = shift_engine.get_employee_shift(employee, today)

    record = AttendanceRecord.objects.create(
        employee=employee,
        date=today,
        shift=shift,
        time_in=now,
        source='web_clock',
        created_by=request.user,
        updated_by=request.user,
    )
    attendance_engine.auto_compute(record)
    record.save(update_fields=[
        'is_holiday', 'holiday_type', 'is_rest_day',
    ])
    return Response(AttendanceRecordSerializer(record).data, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clock_out(request):
    try:
        employee = Employee.objects.get(user=request.user, is_active=True)
    except Employee.DoesNotExist:
        return Response({'detail': 'No active employee profile.'}, status=400)

    now = timezone.now()
    today = now.date()

    try:
        record = AttendanceRecord.objects.get(employee=employee, date=today, time_out__isnull=True)
    except AttendanceRecord.DoesNotExist:
        return Response({'detail': 'No active clock-in found for today.'}, status=400)

    record.time_out = now
    record.updated_by = request.user
    attendance_engine.auto_compute(record)
    record.save()
    return Response(AttendanceRecordSerializer(record).data)


@api_view(['PATCH'])
@permission_classes([IsAdminOrSuperAdmin])
def approve_record(request, pk):
    record = AttendanceRecord.objects.get(pk=pk)
    record.is_approved = True
    record.updated_by = request.user
    record.save(update_fields=['is_approved', 'updated_by'])
    return Response(AttendanceRecordSerializer(record).data)


@api_view(['POST'])
@permission_classes([IsAdminOrSuperAdmin])
def bulk_approve(request):
    ids = request.data.get('ids', [])
    if not ids:
        return Response({'detail': 'No IDs provided.'}, status=400)
    updated = AttendanceRecord.objects.filter(pk__in=ids, is_approved=False).update(
        is_approved=True, updated_by=request.user,
    )
    return Response({'approved': updated})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_records(request):
    try:
        employee = Employee.objects.get(user=request.user, is_active=True)
    except Employee.DoesNotExist:
        return Response([])
    qs = AttendanceRecord.objects.filter(employee=employee).order_by('-date')[:60]
    return Response(AttendanceRecordSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_summary(request):
    try:
        employee = Employee.objects.get(user=request.user, is_active=True)
    except Employee.DoesNotExist:
        return Response({'detail': 'No employee profile.'}, status=400)

    from hr.models import PayrollPeriod
    period_id = request.query_params.get('period')
    if not period_id:
        return Response({'detail': 'period query parameter required.'}, status=400)
    try:
        period = PayrollPeriod.objects.get(pk=int(period_id))
    except PayrollPeriod.DoesNotExist:
        return Response({'detail': 'Period not found.'}, status=404)

    agg = attendance_engine.aggregate_for_period(employee, period)
    return Response(AttendanceSummarySerializer(agg).data)


@api_view(['GET'])
@permission_classes([IsAdminOrSuperAdmin])
def attendance_summary(request):
    from hr.models import PayrollPeriod
    period_id = request.query_params.get('period')
    if not period_id:
        return Response({'detail': 'period query parameter required.'}, status=400)
    try:
        period = PayrollPeriod.objects.get(pk=int(period_id))
    except PayrollPeriod.DoesNotExist:
        return Response({'detail': 'Period not found.'}, status=404)

    employee_id = request.query_params.get('employee')
    if employee_id:
        employee = Employee.objects.get(pk=int(employee_id))
        agg = attendance_engine.aggregate_for_period(employee, period)
        return Response({
            'employee': employee.employee_code,
            'summary': AttendanceSummarySerializer(agg).data,
        })

    employees = Employee.objects.filter(is_active=True)
    results = []
    for emp in employees:
        agg = attendance_engine.aggregate_for_period(emp, period)
        if agg['has_attendance_data']:
            results.append({
                'employee': emp.employee_code,
                'employee_name': f'{emp.user.first_name} {emp.user.last_name}'.strip(),
                'summary': AttendanceSummarySerializer(agg).data,
            })
    return Response(results)


@api_view(['GET'])
@permission_classes([IsAdminOrSuperAdmin])
def payroll_preview(request):
    from hr.models import PayrollPeriod
    period_id = request.query_params.get('period')
    if not period_id:
        return Response({'detail': 'period query parameter required.'}, status=400)
    try:
        period = PayrollPeriod.objects.get(pk=int(period_id))
    except PayrollPeriod.DoesNotExist:
        return Response({'detail': 'Period not found.'}, status=404)

    unapproved = attendance_engine.get_unapproved_count(period)
    missing_clockout = attendance_engine.get_missing_clock_out_count(period)

    return Response({
        'period': str(period),
        'unapproved_records': unapproved,
        'missing_clock_out': missing_clockout,
        'warnings': [
            f'{unapproved} unapproved attendance record(s)' if unapproved > 0 else None,
            f'{missing_clockout} record(s) with missing clock-out' if missing_clockout > 0 else None,
        ],
    })
