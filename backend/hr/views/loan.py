from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.models import log_activity
from accounts.permissions import IsAdminOrSuperAdmin

from hr.models import Loan, LoanPayment
from hr.serializers import LoanSerializer, LoanWriteSerializer, LoanPaymentSerializer
from hr.views._pagination import paginate_or_list


@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrSuperAdmin])
def loan_list(request):
    if request.method == 'GET':
        qs = Loan.objects.select_related('employee', 'employee__user').prefetch_related('payments').all()
        employee = request.query_params.get('employee')
        if employee:
            qs = qs.filter(employee_id=employee)
        st = request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)
        ad = request.query_params.get('auto_deduct')
        if ad is not None:
            qs = qs.filter(auto_deduct=ad.lower() == 'true')
        return paginate_or_list(request, qs, LoanSerializer)

    serializer = LoanWriteSerializer(data=request.data)
    if serializer.is_valid():
        loan = serializer.save(
            created_by=request.user,
            status=Loan.Status.ACTIVE,
            disbursed_at=timezone.now(),
        )
        log_activity(request.user, 'loan',
                     f'Created and disbursed loan #{loan.id} for {loan.employee.employee_code} (PHP {loan.principal})')
        return Response(LoanSerializer(loan).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAdminOrSuperAdmin])
def loan_detail(request, pk):
    try:
        loan = Loan.objects.select_related('employee').prefetch_related('payments').get(pk=pk)
    except Loan.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(LoanSerializer(loan).data)
    if loan.status != Loan.Status.ACTIVE:
        return Response({'detail': 'Only active loans can be modified.'}, status=status.HTTP_400_BAD_REQUEST)
    allowed = {'installment_amount', 'auto_deduct', 'purpose', 'interest_rate_percent', 'interest_method', 'term_periods'}
    data = {k: v for k, v in request.data.items() if k in allowed}
    if not data:
        return Response({'detail': 'No editable fields supplied.'}, status=status.HTTP_400_BAD_REQUEST)
    for k, v in data.items():
        setattr(loan, k, v)
    loan.save()
    log_activity(request.user, 'loan', f'Updated loan #{loan.id}: {", ".join(data.keys())}')
    return Response(LoanSerializer(loan).data)


@api_view(['POST'])
@permission_classes([IsAdminOrSuperAdmin])
def loan_cancel(request, pk):
    try:
        loan = Loan.objects.get(pk=pk)
    except Loan.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if loan.status != Loan.Status.ACTIVE:
        return Response({'detail': 'Only active loans can be cancelled.'}, status=status.HTTP_400_BAD_REQUEST)
    if loan.payments.filter(is_voided=False).exists():
        return Response({'detail': 'Cannot cancel: payments exist. Use default instead.'},
                        status=status.HTTP_409_CONFLICT)
    loan.status = Loan.Status.CANCELLED
    loan.save(update_fields=['status', 'updated_at'])
    log_activity(request.user, 'loan', f'Cancelled loan #{loan.id}')
    return Response(LoanSerializer(loan).data)


@api_view(['POST'])
@permission_classes([IsAdminOrSuperAdmin])
def loan_default(request, pk):
    try:
        loan = Loan.objects.get(pk=pk)
    except Loan.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if loan.status != Loan.Status.ACTIVE:
        return Response({'detail': 'Only active loans can be marked as defaulted.'}, status=status.HTTP_400_BAD_REQUEST)
    loan.status = Loan.Status.DEFAULTED
    loan.save(update_fields=['status', 'updated_at'])
    log_activity(request.user, 'loan', f'Marked loan #{loan.id} DEFAULTED')
    return Response(LoanSerializer(loan).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrSuperAdmin])
def loan_payments(request, pk):
    try:
        loan = Loan.objects.get(pk=pk)
    except Loan.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(LoanPaymentSerializer(loan.payments.all(), many=True).data)

    with transaction.atomic():
        loan = Loan.objects.select_for_update().get(pk=pk)
        serializer = LoanPaymentSerializer(data=request.data, context={'loan': loan})
        if serializer.is_valid():
            payment = serializer.save(loan=loan, recorded_by=request.user)
            log_activity(request.user, 'loan',
                         f'Recorded {payment.source} payment of PHP {payment.amount} on loan #{loan.id}')
            if loan.remaining_balance <= 0:
                loan.status = Loan.Status.PAID_OFF
                loan.paid_off_at = timezone.now()
                loan.save(update_fields=['status', 'paid_off_at', 'updated_at'])
            return Response(LoanPaymentSerializer(payment).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
