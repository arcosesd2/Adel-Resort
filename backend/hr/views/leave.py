from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAdminOrSuperAdmin
from hr.models import LeaveType, LeaveBalance, LeaveRequest, Employee
from hr.services import leave_engine
from hr.serializers.leave import (
    LeaveTypeSerializer, LeaveBalanceSerializer, LeaveBalanceWriteSerializer,
    LeaveRequestSerializer, LeaveRequestWriteSerializer,
)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrSuperAdmin])
def leave_type_list(request):
    if request.method == 'GET':
        qs = LeaveType.objects.all()
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        return Response(LeaveTypeSerializer(qs, many=True).data)
    serializer = LeaveTypeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=201)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminOrSuperAdmin])
def leave_type_detail(request, pk):
    lt = LeaveType.objects.get(pk=pk)
    if request.method == 'GET':
        return Response(LeaveTypeSerializer(lt).data)
    if request.method == 'DELETE':
        lt.is_active = False
        lt.save(update_fields=['is_active'])
        return Response(status=204)
    serializer = LeaveTypeSerializer(lt, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrSuperAdmin])
def leave_balance_list(request):
    if request.method == 'GET':
        qs = LeaveBalance.objects.select_related('employee', 'leave_type')
        employee = request.query_params.get('employee')
        if employee:
            qs = qs.filter(employee_id=int(employee))
        year = request.query_params.get('year')
        if year:
            qs = qs.filter(year=int(year))
        return Response(LeaveBalanceSerializer(qs, many=True).data)
    serializer = LeaveBalanceWriteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(LeaveBalanceSerializer(serializer.instance).data, status=201)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAdminOrSuperAdmin])
def leave_balance_detail(request, pk):
    balance = LeaveBalance.objects.get(pk=pk)
    if request.method == 'GET':
        return Response(LeaveBalanceSerializer(balance).data)
    serializer = LeaveBalanceWriteSerializer(balance, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(LeaveBalanceSerializer(serializer.instance).data)


@api_view(['POST'])
@permission_classes([IsAdminOrSuperAdmin])
def leave_balance_initialize(request):
    year = request.data.get('year')
    if not year:
        return Response({'detail': 'year required.'}, status=400)
    employees = Employee.objects.filter(is_active=True)
    total = 0
    for emp in employees:
        created = leave_engine.initialize_leave_balances(emp, int(year))
        total += len(created)
    return Response({'initialized': total})


@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrSuperAdmin])
def leave_request_list_admin(request):
    if request.method == 'GET':
        qs = LeaveRequest.objects.select_related('employee', 'employee__user', 'leave_type')
        status = request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        employee = request.query_params.get('employee')
        if employee:
            qs = qs.filter(employee_id=int(employee))
        return Response(LeaveRequestSerializer(qs, many=True).data)
    serializer = LeaveRequestWriteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(LeaveRequestSerializer(serializer.instance).data, status=201)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def leave_request_list_employee(request):
    try:
        employee = Employee.objects.get(user=request.user, is_active=True)
    except Employee.DoesNotExist:
        return Response({'detail': 'No employee profile.'}, status=400)

    if request.method == 'GET':
        qs = LeaveRequest.objects.filter(employee=employee).select_related('leave_type')
        return Response(LeaveRequestSerializer(qs, many=True).data)

    serializer = LeaveRequestWriteSerializer(data={**request.data, 'employee': employee.id})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(LeaveRequestSerializer(serializer.instance).data, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_leave_balances(request):
    try:
        employee = Employee.objects.get(user=request.user, is_active=True)
    except Employee.DoesNotExist:
        return Response([])
    qs = LeaveBalance.objects.filter(employee=employee).select_related('leave_type')
    return Response(LeaveBalanceSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdminOrSuperAdmin])
def leave_request_approve(request, pk):
    lr = LeaveRequest.objects.get(pk=pk)
    try:
        leave_engine.approve_leave(lr, request.user)
        return Response(LeaveRequestSerializer(lr).data)
    except ValueError as e:
        return Response({'detail': str(e)}, status=400)


@api_view(['POST'])
@permission_classes([IsAdminOrSuperAdmin])
def leave_request_reject(request, pk):
    lr = LeaveRequest.objects.get(pk=pk)
    notes = request.data.get('notes', '')
    try:
        leave_engine.reject_leave(lr, request.user, notes)
        return Response(LeaveRequestSerializer(lr).data)
    except ValueError as e:
        return Response({'detail': str(e)}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def leave_request_cancel(request, pk):
    try:
        lr = LeaveRequest.objects.get(pk=pk, employee__user=request.user)
    except LeaveRequest.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)
    try:
        leave_engine.cancel_leave(lr)
        return Response(LeaveRequestSerializer(lr).data)
    except ValueError as e:
        return Response({'detail': str(e)}, status=400)
