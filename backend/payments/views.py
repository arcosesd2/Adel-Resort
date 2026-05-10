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
from .serializers import SubmitProofSerializer, GCashConfigSerializer, AdminPaymentSerializer
from accounts.permissions import IsSuperAdmin, IsAdminOrSuperAdmin
from vouchers.utils import get_booking_voucher_validity_status

PAYMENT_DEADLINE_MINUTES = 60


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

    if booking.status == BookingStatus.CONFIRMED and hasattr(booking, 'payment'):
        return Response({'detail': 'Booking already confirmed.'}, status=status.HTTP_400_BAD_REQUEST)

    if booking.status == BookingStatus.CANCELLED:
        return Response({'detail': 'Booking has been cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

    if hasattr(booking, 'payment'):
        if booking.payment.status == 'failed':
            # Allow resubmission: delete the rejected payment so a new one can be created
            booking.payment.delete()
        else:
            return Response({'detail': 'Payment proof already submitted.'}, status=status.HTTP_400_BAD_REQUEST)

    # Check payment deadline (1 hour after booking creation)
    deadline = booking.created_at + timedelta(minutes=PAYMENT_DEADLINE_MINUTES)
    if timezone.now() > deadline:
        booking.status = BookingStatus.CANCELLED
        booking.save(update_fields=['status'])
        return Response(
            {'detail': 'Payment deadline has passed. This booking has been automatically cancelled.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    amount = booking.total_price
    discount_amount = Decimal('0')
    promo_discount_amount = Decimal('0')
    voucher_code = request.data.get('voucher_code', '').strip()
    promotion_id = request.data.get('promotion_id')

    if promotion_id:
        from content.models import Promotion
        from vouchers.views import _is_promotion_applicable, _calc_promo_discount
        try:
            promo = Promotion.objects.get(pk=promotion_id, is_active=True)
            booking_dates = [slot['date'] for slot in booking.slots] if booking.slots else [booking.check_in.isoformat()]
            room_type = booking.room.room_type
            if _is_promotion_applicable(promo, booking_dates, room_type):
                if not promo.min_booking_amount or amount >= promo.min_booking_amount:
                    promo_discount_amount = _calc_promo_discount(promo, amount)
                    amount = amount - promo_discount_amount
        except (Promotion.DoesNotExist, ValueError):
            pass

    if voucher_code:
        from django.db import transaction
        from vouchers.models import Voucher, VoucherUsage

        with transaction.atomic():
            try:
                voucher = Voucher.objects.select_for_update().get(code__iexact=voucher_code)
            except Voucher.DoesNotExist:
                return Response({'detail': 'Invalid voucher code.'}, status=status.HTTP_400_BAD_REQUEST)

            if promotion_id and promo_discount_amount > 0:
                from content.models import Promotion
                try:
                    promo = Promotion.objects.get(pk=promotion_id)
                    if not promo.allows_voucher:
                        return Response({'detail': 'This promotion cannot be combined with a voucher.'}, status=status.HTTP_400_BAD_REQUEST)
                except Promotion.DoesNotExist:
                    pass

            booking_dates = [slot['date'] for slot in booking.slots] if booking.slots else [booking.check_in]
            if not voucher.is_active or get_booking_voucher_validity_status(voucher, booking_dates) != 'valid':
                return Response({'detail': 'Voucher is not valid.'}, status=status.HTTP_400_BAD_REQUEST)
            # Re-check times_used AFTER select_for_update() to prevent race condition
            if voucher.max_uses is not None and voucher.times_used >= voucher.max_uses:
                return Response({'detail': 'Voucher has reached its maximum uses.'}, status=status.HTTP_400_BAD_REQUEST)
            if voucher.min_booking_amount and amount < voucher.min_booking_amount:
                return Response({'detail': 'Booking amount does not meet voucher minimum.'}, status=status.HTTP_400_BAD_REQUEST)

            if voucher.discount_type == 'percentage':
                discount_amount = (amount * voucher.discount_value / Decimal('100')).quantize(Decimal('0.01'))
                discount_amount = min(discount_amount, amount)
            else:
                discount_amount = min(voucher.discount_value, amount)

            amount = max(amount - discount_amount, Decimal('0'))

            voucher.times_used = F('times_used') + 1
            voucher.save(update_fields=['times_used'])
            VoucherUsage.objects.create(
                voucher=voucher,
                booking=booking,
                user=request.user,
                discount_amount=discount_amount,
            )

    raw_payment_type = serializer.validated_data.get('payment_type', 'full')
    if raw_payment_type not in dict(PaymentType.choices):
        raw_payment_type = 'full'

    Payment.objects.create(
        booking=booking,
        gcash_reference=serializer.validated_data['gcash_reference'],
        proof_of_payment=serializer.validated_data['proof_of_payment'],
        payment_type=raw_payment_type,
        amount=amount,
        currency='php',
        status=PaymentStatus.PENDING,
    )

    # Send notification + email to the guest
    try:
        from accounts.models import create_notification, notify_staff
        from accounts.emails import send_payment_received_email
        create_notification(
            request.user, 'payment_received',
            'Payment Submitted',
            f'Your payment proof for {booking.room.name} has been submitted and is awaiting verification.',
            f'/booking/{booking.id}',
        )
        send_payment_received_email(request.user, booking)
        notify_staff(
            'pending_payment_review',
            'New Payment Awaiting Approval',
            f'Guest {request.user.get_full_name() or request.user.username} submitted payment for {booking.room.name} ({booking.reference_code}). Please verify.',
            '/admin-dashboard/payments',
            exclude_user=request.user,
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
@permission_classes([IsAdminOrSuperAdmin])
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
@permission_classes([IsAdminOrSuperAdmin])
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
