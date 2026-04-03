from datetime import timedelta
from decimal import Decimal
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.db.models import F
from django.utils import timezone

from bookings.models import Booking, BookingStatus
from .models import Payment, PaymentStatus, PaymentType, GCashConfig
from .serializers import SubmitProofSerializer, GCashConfigSerializer
from accounts.permissions import IsSuperAdmin

PAYMENT_DEADLINE_HOURS = 24


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def submit_proof_of_payment(request):
    serializer = SubmitProofSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    booking_id = serializer.validated_data['booking_id']
    try:
        booking = Booking.objects.get(pk=booking_id, user=request.user)
    except Booking.DoesNotExist:
        return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

    if booking.status == BookingStatus.CONFIRMED:
        return Response({'detail': 'Booking already confirmed.'}, status=status.HTTP_400_BAD_REQUEST)

    if booking.status == BookingStatus.CANCELLED:
        return Response({'detail': 'Booking has been cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

    if hasattr(booking, 'payment'):
        return Response({'detail': 'Payment proof already submitted.'}, status=status.HTTP_400_BAD_REQUEST)

    # Check 24-hour payment deadline
    deadline = booking.created_at + timedelta(hours=PAYMENT_DEADLINE_HOURS)
    if timezone.now() > deadline:
        booking.status = BookingStatus.CANCELLED
        booking.save(update_fields=['status'])
        return Response(
            {'detail': 'Payment deadline has passed. This booking has been automatically cancelled.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    amount = booking.total_price
    discount_amount = Decimal('0')
    voucher_code = request.data.get('voucher_code', '').strip()

    if voucher_code:
        from django.db import transaction
        from vouchers.models import Voucher, VoucherUsage

        with transaction.atomic():
            try:
                voucher = Voucher.objects.select_for_update().get(code__iexact=voucher_code)
            except Voucher.DoesNotExist:
                return Response({'detail': 'Invalid voucher code.'}, status=status.HTTP_400_BAD_REQUEST)

            now = timezone.now()
            if not voucher.is_active or now < voucher.valid_from or now > voucher.valid_until:
                return Response({'detail': 'Voucher is not valid.'}, status=status.HTTP_400_BAD_REQUEST)
            if voucher.max_uses is not None and voucher.times_used >= voucher.max_uses:
                return Response({'detail': 'Voucher has reached its maximum uses.'}, status=status.HTTP_400_BAD_REQUEST)
            if voucher.min_booking_amount and amount < voucher.min_booking_amount:
                return Response({'detail': 'Booking amount does not meet voucher minimum.'}, status=status.HTTP_400_BAD_REQUEST)

            if voucher.discount_type == 'percentage':
                discount_amount = (amount * voucher.discount_value / Decimal('100')).quantize(Decimal('0.01'))
                discount_amount = min(discount_amount, amount)
            else:
                discount_amount = min(voucher.discount_value, amount)

            amount = amount - discount_amount

            voucher.times_used = F('times_used') + 1
            voucher.save(update_fields=['times_used'])
            VoucherUsage.objects.create(
                voucher=voucher,
                booking=booking,
                user=request.user,
                discount_amount=discount_amount,
            )

    Payment.objects.create(
        booking=booking,
        gcash_reference=serializer.validated_data['gcash_reference'],
        proof_of_payment=serializer.validated_data['proof_of_payment'],
        payment_type=PaymentType.FULL,
        amount=amount,
        currency='php',
        status=PaymentStatus.PENDING,
    )

    # Send notification + email
    try:
        from accounts.models import create_notification
        from accounts.emails import send_payment_received_email
        create_notification(
            request.user, 'payment_received',
            'Payment Submitted',
            f'Your payment proof for {booking.room.name} has been submitted and is awaiting verification.',
            f'/booking/{booking.id}',
        )
        send_payment_received_email(request.user, booking)
    except Exception:
        pass

    return Response({'detail': 'Payment proof submitted. Awaiting admin confirmation.'}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def gcash_config(request):
    config = GCashConfig.load()
    return Response(GCashConfigSerializer(config, context={'request': request}).data)


@api_view(['PATCH'])
@permission_classes([IsSuperAdmin])
@parser_classes([MultiPartParser, FormParser])
def gcash_config_update(request):
    config = GCashConfig.load()
    serializer = GCashConfigSerializer(config, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
