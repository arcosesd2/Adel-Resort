from decimal import Decimal
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.utils import timezone

from bookings.models import Booking
from .models import Voucher
from .serializers import VoucherSerializer, VoucherValidateSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def validate_voucher(request):
    serializer = VoucherValidateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    code = serializer.validated_data['code'].strip().upper()
    booking_id = serializer.validated_data['booking_id']

    try:
        booking = Booking.objects.get(pk=booking_id, user=request.user)
    except Booking.DoesNotExist:
        return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        voucher = Voucher.objects.get(code__iexact=code)
    except Voucher.DoesNotExist:
        return Response({'detail': 'Invalid voucher code.'}, status=status.HTTP_400_BAD_REQUEST)

    now = timezone.now()
    if not voucher.is_active:
        return Response({'detail': 'This voucher is no longer active.'}, status=status.HTTP_400_BAD_REQUEST)
    if now < voucher.valid_from:
        return Response({'detail': 'This voucher is not yet valid.'}, status=status.HTTP_400_BAD_REQUEST)
    if now > voucher.valid_until:
        return Response({'detail': 'This voucher has expired.'}, status=status.HTTP_400_BAD_REQUEST)
    if voucher.max_uses is not None and voucher.times_used >= voucher.max_uses:
        return Response({'detail': 'This voucher has reached its maximum uses.'}, status=status.HTTP_400_BAD_REQUEST)

    total = booking.total_price
    if voucher.min_booking_amount and total < voucher.min_booking_amount:
        return Response(
            {'detail': f'Minimum booking amount of \u20b1{voucher.min_booking_amount} required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if voucher.discount_type == 'percentage':
        discount = (total * voucher.discount_value / Decimal('100')).quantize(Decimal('0.01'))
        discount = min(discount, total)
    else:
        discount = min(voucher.discount_value, total)

    final_price = total - discount

    return Response({
        'valid': True,
        'code': voucher.code,
        'discount_type': voucher.discount_type,
        'discount_value': str(voucher.discount_value),
        'discount_amount': str(discount),
        'original_price': str(total),
        'final_price': str(final_price),
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def voucher_list_create(request):
    if request.method == 'GET':
        vouchers = Voucher.objects.all()
        serializer = VoucherSerializer(vouchers, many=True)
        return Response(serializer.data)

    serializer = VoucherSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    # Store code uppercase
    serializer.save(code=serializer.validated_data['code'].upper())
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def voucher_toggle(request, pk):
    try:
        voucher = Voucher.objects.get(pk=pk)
    except Voucher.DoesNotExist:
        return Response({'detail': 'Voucher not found.'}, status=status.HTTP_404_NOT_FOUND)
    voucher.is_active = not voucher.is_active
    voucher.save(update_fields=['is_active'])
    return Response(VoucherSerializer(voucher).data)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def voucher_delete(request, pk):
    try:
        voucher = Voucher.objects.get(pk=pk)
    except Voucher.DoesNotExist:
        return Response({'detail': 'Voucher not found.'}, status=status.HTTP_404_NOT_FOUND)
    voucher.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
