from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import log_activity
from accounts.permissions import IsAdminOrSuperAdmin

from hr.models import Employee, CompensationProfile, Loan, Payslip
from hr.serializers import (
    EmployeeSerializer, EmployeeWriteSerializer, CompensationProfileSerializer,
    LoanSerializer, PayslipSerializer,
)


def _get_ip(request):
    fwd = request.META.get('HTTP_X_FORWARDED_FOR')
    return fwd.split(',')[0].strip() if fwd else request.META.get('REMOTE_ADDR')


@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrSuperAdmin])
def employee_list(request):
    if request.method == 'GET':
        qs = Employee.objects.select_related('user').all()
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        department = request.query_params.get('department')
        if department:
            qs = qs.filter(department__iexact=department)
        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                user__first_name__icontains=search,
            ) | qs.filter(
                user__last_name__icontains=search,
            ) | qs.filter(
                employee_code__icontains=search,
            )
        return Response(EmployeeSerializer(qs, many=True).data)

    serializer = EmployeeWriteSerializer(data=request.data)
    if serializer.is_valid():
        emp = serializer.save()
        log_activity(request.user, 'payroll', f'Created employee {emp.employee_code}',
                     ip_address=_get_ip(request))
        return Response(EmployeeSerializer(emp).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminOrSuperAdmin])
def employee_detail(request, pk):
    try:
        emp = Employee.objects.select_related('user').get(pk=pk)
    except Employee.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(EmployeeSerializer(emp).data)

    if request.method == 'PATCH':
        serializer = EmployeeWriteSerializer(emp, data=request.data, partial=True)
        if serializer.is_valid():
            emp = serializer.save()
            log_activity(request.user, 'payroll', f'Updated employee {emp.employee_code}',
                         ip_address=_get_ip(request))
            return Response(EmployeeSerializer(emp).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE = soft delete
    if emp.loans.filter(status=Loan.Status.ACTIVE).exists():
        return Response({'detail': 'Employee has active loans; settle them first.'},
                        status=status.HTTP_409_CONFLICT)
    emp.is_active = False
    emp.save(update_fields=['is_active', 'updated_at'])
    log_activity(request.user, 'payroll', f'Deactivated employee {emp.employee_code}',
                 ip_address=_get_ip(request))
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrSuperAdmin])
def employee_compensation(request, pk):
    try:
        emp = Employee.objects.get(pk=pk)
    except Employee.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        history = emp.compensation_history.all()
        return Response(CompensationProfileSerializer(history, many=True).data)

    serializer = CompensationProfileSerializer(data=request.data)
    if serializer.is_valid():
        comp = serializer.save(employee=emp, created_by=request.user)
        log_activity(request.user, 'payroll',
                     f'Set compensation for {emp.employee_code}: PHP {comp.monthly_basic_salary} ({comp.pay_schedule}) eff {comp.effective_date}',
                     ip_address=_get_ip(request))
        return Response(CompensationProfileSerializer(comp).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_me(request):
    try:
        emp = Employee.objects.select_related('user').get(user=request.user)
    except Employee.DoesNotExist:
        return Response({'detail': 'No employee profile.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(EmployeeSerializer(emp).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_me_loans(request):
    try:
        emp = Employee.objects.get(user=request.user)
    except Employee.DoesNotExist:
        return Response([], status=status.HTTP_200_OK)
    qs = emp.loans.all()
    return Response(LoanSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_me_payslips(request):
    try:
        emp = Employee.objects.get(user=request.user)
    except Employee.DoesNotExist:
        return Response([], status=status.HTTP_200_OK)
    qs = Payslip.objects.filter(employee=emp).exclude(run__status='voided').select_related('run', 'run__period')
    return Response(PayslipSerializer(qs, many=True).data)
