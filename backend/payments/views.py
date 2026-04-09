from datetime import timedelta
from decimal import Decimal
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.db.models import F
from django.utils import timezone

from bookings.models import Booking, BookingStatus
from .models import Payment, PaymentStatus, PaymentType, GCashConfig
from .serializers import SubmitProofSerializer, GCashConfigSerializer, AdminPaymentSerializer
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

    # Send notification + email to the guest
    try:
        from accounts.models import create_notification
        from accounts.emails import send_payment_received_email
        from django.contrib.auth import get_user_model
        User = get_user_model()
        create_notification(
            request.user, 'payment_received',
            'Payment Submitted',
            f'Your payment proof for {booking.room.name} has been submitted and is awaiting verification.',
            f'/booking/{booking.id}',
        )
        send_payment_received_email(request.user, booking)
        # Notify all staff and superadmin users
        staff_users = User.objects.filter(is_staff=True).exclude(pk=request.user.pk)
        for staff in staff_users:
            create_notification(
                staff, 'payment_received',
                'New Payment Awaiting Approval',
                f'Guest {request.user.get_full_name() or request.user.username} submitted payment for {booking.room.name} ({booking.reference_code}). Please verify.',
                '/admin-dashboard/payments',
            )
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
        try:
            from accounts.models import log_activity
            log_activity(request.user, 'settings', 'Updated GCash settings')
        except Exception:
            pass
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_payment_list(request):
    """List all payments for staff/superadmin. Filter by ?status=pending|succeeded|failed|refunded"""
    qs = Payment.objects.select_related(
        'booking', 'booking__user', 'booking__room'
    ).order_by('-created_at')

    status_filter = request.query_params.get('status', '')
    if status_filter and status_filter in [s[0] for s in PaymentStatus.choices]:
        qs = qs.filter(status=status_filter)

    serializer = AdminPaymentSerializer(qs, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def admin_payment_update(request, pk):
    """Update payment status (succeeded/failed/refunded) and sync booking status."""
    try:
        payment = Payment.objects.select_related('booking').get(pk=pk)
    except Payment.DoesNotExist:
        return Response({'detail': 'Payment not found.'}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get('status')
    valid_statuses = [s[0] for s in PaymentStatus.choices]
    if new_status not in valid_statuses:
        return Response(
            {'detail': f'Invalid status. Choose from: {", ".join(valid_statuses)}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    old_status = payment.status
    payment.status = new_status
    payment.save(update_fields=['status', 'updated_at'])

    # Sync booking status based on payment outcome
    booking = payment.booking
    if new_status == PaymentStatus.SUCCEEDED and booking.status != BookingStatus.CONFIRMED:
        booking.status = BookingStatus.CONFIRMED
        booking.approved_at = timezone.now()
        booking.save(update_fields=['status', 'approved_at'])
        # Notify guest
        try:
            from accounts.models import create_notification
            from accounts.emails import send_booking_confirmation_email
            create_notification(
                booking.user, 'booking_confirmed',
                'Booking Confirmed!',
                f'Your payment for {booking.room.name} has been verified and your booking is confirmed.',
                f'/booking/{booking.id}',
            )
            send_booking_confirmation_email(booking.user, booking)
        except Exception:
            pass
    elif new_status == PaymentStatus.FAILED and booking.status == BookingStatus.CONFIRMED:
        booking.status = BookingStatus.PENDING
        booking.approved_at = None
        booking.save(update_fields=['status', 'approved_at'])
        try:
            from accounts.models import create_notification
            create_notification(
                booking.user, 'payment_failed',
                'Payment Verification Failed',
                f'Your payment for {booking.room.name} could not be verified. Please resubmit your proof of payment.',
                f'/booking/{booking.id}',
            )
        except Exception:
            pass
    elif new_status == PaymentStatus.REFUNDED:
        booking.status = BookingStatus.CANCELLED
        booking.save(update_fields=['status'])
        try:
            from accounts.models import create_notification
            create_notification(
                booking.user, 'payment_refunded',
                'Payment Refunded',
                f'Your payment for {booking.room.name} has been refunded and your booking has been cancelled.',
                f'/booking/{booking.id}',
            )
        except Exception:
            pass

    try:
        from accounts.models import log_activity
        log_activity(
            request.user, 'payment',
            f'Payment #{payment.id} status changed from {old_status} to {new_status} (Booking #{booking.id})',
        )
    except Exception:
        pass

    serializer = AdminPaymentSerializer(payment, context={'request': request})
    return Response(serializer.data)
