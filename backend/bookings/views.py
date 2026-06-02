from decimal import Decimal

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from accounts.permissions import IsAdminOrSuperAdmin
from rooms.models import Room
from vouchers.utils import get_booking_voucher_validity_status
from .availability import find_slot_conflict
from .models import Booking, BookingStatus
from .serializers import BookingSerializer, AdminBookingSerializer

User = get_user_model()


class BookingListCreateView(generics.ListCreateAPIView):
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Booking.objects.filter(user=self.request.user).select_related('room')

    def perform_create(self, serializer):
        booking = serializer.save()
        try:
            from accounts.models import notify_staff
            notify_staff(
                'new_booking',
                'New Booking',
                f'New booking #{booking.id} for {booking.room.name} by {booking.user.get_full_name() or booking.user.username}.',
                '/admin-dashboard/bookings',
            )
        except Exception:
            pass


class BookingDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(user=self.request.user).select_related('room')

    def destroy(self, request, *args, **kwargs):
        booking = self.get_object()
        if booking.status == BookingStatus.CONFIRMED:
            return Response(
                {'detail': 'Cannot cancel a confirmed booking. Contact support.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        booking.status = BookingStatus.CANCELLED
        booking.save()

        # Reverse voucher usage if any
        try:
            from vouchers.models import VoucherUsage
            from django.db import transaction
            usage = VoucherUsage.objects.select_related('voucher').filter(booking=booking).first()
            if usage:
                with transaction.atomic():
                    voucher = usage.voucher
                    voucher.times_used = F('times_used') - 1
                    voucher.save(update_fields=['times_used'])
                    usage.delete()
        except Exception:
            pass

        try:
            from accounts.models import notify_staff, create_notification
            # Notify all staff
            notify_staff(
                'booking_cancelled',
                'Booking Cancelled',
                f'Guest {booking.user.get_full_name() or booking.user.username} cancelled booking #{booking.id} for {booking.room.name}.',
                '/admin-dashboard/bookings',
                exclude_user=request.user,
            )
            # Confirm to the guest
            create_notification(
                booking.user, 'booking_cancelled',
                'Booking Cancelled',
                f'Your booking for {booking.room.name} has been cancelled.',
                f'/booking/{booking.id}',
            )
        except Exception:
            pass
        return Response({'detail': 'Booking cancelled.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAdminOrSuperAdmin])
def onsite_booking(request):
    """Create a booking for a walk-in guest. Staff-only."""
    data = request.data
    guest_name = data.get('guest_name', '').strip()
    guest_username = data.get('guest_username', '').strip()
    guest_phone = data.get('guest_phone', '').strip()
    room_id = data.get('room')
    guests = data.get('guests', 1)
    slots = data.get('slots', [])
    special_requests = data.get('special_requests', '')
    is_backdate = bool(data.get('backdate', False))
    excluded_from_sales = bool(data.get('excluded_from_sales', False))

    if not guest_name or not room_id or not slots:
        return Response({'detail': 'Guest name, room, and slots are required.'}, status=status.HTTP_400_BAD_REQUEST)

    # Parse guest name
    name_parts = guest_name.split(' ', 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ''

    # Find or create guest user
    if guest_username:
        if User.objects.filter(username=guest_username).exists():
            return Response(
                {'detail': f'Username "{guest_username}" is already taken. Use a different username or leave blank for auto-generated.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = User.objects.create(
            username=guest_username,
            first_name=first_name,
            last_name=last_name,
            phone=guest_phone,
        )
        user.set_unusable_password()
        user.save()
    else:
        # Create a placeholder user with a generated username
        import uuid
        placeholder_username = f'walkin-{uuid.uuid4().hex[:8]}'
        user = User.objects.create(
            username=placeholder_username,
            first_name=first_name,
            last_name=last_name,
            phone=guest_phone,
        )
        user.set_unusable_password()
        user.save()

    # Validate room
    try:
        room = Room.objects.get(id=room_id, is_active=True)
    except Room.DoesNotExist:
        return Response({'detail': 'Room not found.'}, status=status.HTTP_400_BAD_REQUEST)

    if guests > room.capacity:
        return Response({'detail': f'This room fits max {room.capacity} persons.'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate slots and check conflicts
    if room.booking_mode == 'overnight':
        if any(s.get('slot') != 'overnight' for s in slots):
            return Response({'detail': 'This room uses overnight booking.'}, status=status.HTTP_400_BAD_REQUEST)
    elif room.booking_mode == '24hr':
        if any(s.get('slot') != '24hr' for s in slots):
            return Response({'detail': 'This room uses 24-hour booking.'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        if any(s.get('slot') in ('overnight', '24hr') for s in slots):
            return Response({'detail': 'This room uses day/night slot booking.'}, status=status.HTTP_400_BAD_REQUEST)
        if room.is_day_only and any(s.get('slot') == 'night' for s in slots):
            return Response({'detail': 'This accommodation is available for day tours only.'}, status=status.HTTP_400_BAD_REQUEST)

    slot_dates = [s['date'] for s in slots]
    min_date = min(slot_dates)
    max_date = max(slot_dates)

    if is_backdate:
        from datetime import date as date_cls
        if max_date >= date_cls.today().isoformat():
            return Response(
                {'detail': 'Backdated bookings must have all dates in the past.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    check_statuses = ['confirmed', 'pending']
    if is_backdate:
        check_statuses.append('completed')
    conflict = find_slot_conflict(room, slots, statuses=check_statuses)
    if conflict:
        return Response({'detail': conflict}, status=status.HTTP_400_BAD_REQUEST)

    # Calculate price
    day_price = room.day_price or Decimal('0')
    night_price = room.night_price or room.day_price
    total = sum(night_price if s['slot'] == 'night' else day_price for s in slots)

    # Manual discount (fixed amount or percentage)
    manual_discount = Decimal('0')
    raw_manual_discount = data.get('manual_discount')
    manual_discount_type = data.get('manual_discount_type', 'fixed')
    if raw_manual_discount:
        try:
            discount_value = Decimal(str(raw_manual_discount))
            if discount_value < 0:
                return Response({'detail': 'Manual discount cannot be negative.'}, status=status.HTTP_400_BAD_REQUEST)
            if manual_discount_type == 'percentage':
                if discount_value > 100:
                    return Response({'detail': 'Percentage discount cannot exceed 100%.'}, status=status.HTTP_400_BAD_REQUEST)
                manual_discount = (total * discount_value / Decimal('100')).quantize(Decimal('0.01'))
                manual_discount = min(manual_discount, total)
            else:
                if discount_value > total:
                    return Response({'detail': 'Manual discount cannot exceed the total price.'}, status=status.HTTP_400_BAD_REQUEST)
                manual_discount = discount_value
            total = total - manual_discount
        except Exception:
            return Response({'detail': 'Invalid manual discount value.'}, status=status.HTTP_400_BAD_REQUEST)

    # Voucher support
    voucher_code = data.get('voucher_code', '').strip() if data.get('voucher_code') else ''
    discount_amount = Decimal('0')
    voucher = None

    if voucher_code:
        from vouchers.models import Voucher, VoucherUsage

        with transaction.atomic():
            try:
                voucher = Voucher.objects.select_for_update().get(code__iexact=voucher_code)
            except Voucher.DoesNotExist:
                return Response({'detail': 'Invalid voucher code.'}, status=status.HTTP_400_BAD_REQUEST)

            booking_dates = [s['date'] for s in slots]
            if not voucher.is_active or get_booking_voucher_validity_status(voucher, booking_dates) != 'valid':
                return Response({'detail': 'Voucher is not valid.'}, status=status.HTTP_400_BAD_REQUEST)
            if voucher.max_uses is not None and voucher.times_used >= voucher.max_uses:
                return Response({'detail': 'Voucher has reached its maximum uses.'}, status=status.HTTP_400_BAD_REQUEST)
            if voucher.min_booking_amount and total < voucher.min_booking_amount:
                return Response({'detail': 'Booking amount does not meet voucher minimum.'}, status=status.HTTP_400_BAD_REQUEST)

            if voucher.discount_type == 'percentage':
                discount_amount = (total * voucher.discount_value / Decimal('100')).quantize(Decimal('0.01'))
                discount_amount = min(discount_amount, total)
            else:
                discount_amount = min(voucher.discount_value, total)

            total = total - discount_amount

    # For overnight/24hr rooms, check_out is the day after the last slot
    if room.booking_mode in ('overnight', '24hr'):
        from datetime import date as date_cls, timedelta as td
        last = date_cls.fromisoformat(max_date)
        checkout_date = (last + td(days=1)).isoformat()
    else:
        checkout_date = max_date

    with transaction.atomic():
        room = Room.objects.select_for_update().get(pk=room.pk)
        conflict = find_slot_conflict(room, slots, statuses=check_statuses)
        if conflict:
            return Response({'detail': conflict}, status=status.HTTP_400_BAD_REQUEST)
        booking = Booking.objects.create(
            user=user, room=room,
            check_in=min_date, check_out=checkout_date,
            guests=guests, slots=slots,
            total_price=total,
            status=BookingStatus.COMPLETED if is_backdate else BookingStatus.CONFIRMED,
            special_requests=special_requests,
            is_backdated=is_backdate,
            excluded_from_sales=excluded_from_sales,
            manual_discount=manual_discount,
            manual_discount_type=manual_discount_type if manual_discount > 0 else '',
        )

    if voucher:
        from vouchers.models import Voucher as V, VoucherUsage
        with transaction.atomic():
            v = V.objects.select_for_update().get(pk=voucher.pk)
            v.times_used = F('times_used') + 1
            v.save(update_fields=['times_used'])
            VoucherUsage.objects.create(
                voucher=v,
                booking=booking,
                user=user,
                discount_amount=discount_amount,
            )

    response_data = {
        'id': booking.id,
        'guest_name': guest_name,
        'room': room.name,
        'total_price': str(booking.total_price),
        'status': booking.status,
        'slots_summary': booking.slots_summary,
    }
    if manual_discount > 0:
        response_data['manual_discount'] = str(manual_discount)
        response_data['manual_discount_type'] = manual_discount_type
    if discount_amount > 0:
        response_data['discount'] = str(discount_amount)
        response_data['voucher_code'] = voucher_code

    try:
        from accounts.models import log_activity
        booking_type = 'backdated onsite' if is_backdate else 'onsite'
        log_activity(request.user, 'booking',
                     f'Created {booking_type} booking #{booking.id} for "{guest_name}"',
                     details=f'Room: {room.name}, Total: ₱{booking.total_price}')
    except Exception:
        pass

    return Response(response_data, status=status.HTTP_201_CREATED)


class AdminBookingListView(generics.ListAPIView):
    serializer_class = AdminBookingSerializer
    permission_classes = [IsAdminOrSuperAdmin]
    pagination_class = None

    def get_queryset(self):
        qs = Booking.objects.select_related('user', 'room').all().order_by('-created_at')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        room_filter = self.request.query_params.get('room')
        if room_filter:
            qs = qs.filter(room_id=room_filter)
        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(check_out__gte=date_from)
        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(check_in__lte=date_to)
        return qs


class AdminBookingDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminBookingSerializer
    permission_classes = [IsAdminOrSuperAdmin]
    queryset = Booking.objects.select_related('user', 'room').all()

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        booking = serializer.save()
        new_status = booking.status

        if old_status != new_status:
            # Set approved_at when booking is confirmed
            if new_status == BookingStatus.CONFIRMED and not booking.approved_at:
                booking.approved_at = timezone.now()
                booking.save(update_fields=['approved_at'])

            try:
                from accounts.models import log_activity
                log_activity(self.request.user, 'booking',
                             f'Changed booking #{booking.id} status: {old_status} → {new_status}',
                             details=f'Room: {booking.room.name}, Guest: {booking.user.get_full_name()}')
            except Exception:
                pass
            try:
                from accounts.models import create_notification
                from accounts.emails import send_booking_confirmation_email, send_booking_cancelled_email, send_booking_completed_email
                if new_status == BookingStatus.CONFIRMED:
                    create_notification(
                        booking.user, 'booking_confirmed',
                        'Booking Confirmed',
                        f'Your booking for {booking.room.name} has been confirmed!',
                        f'/booking/{booking.id}',
                    )
                    send_booking_confirmation_email(booking.user, booking)

                    # If downpayment, notify user to pay remaining balance within 24h
                    if hasattr(booking, 'payment') and booking.payment.payment_type in ('downpayment', 'partial'):
                        remaining = booking.total_price - booking.payment.amount
                        create_notification(
                            booking.user, 'payment_remaining',
                            'Remaining Balance Due',
                            f'Your booking for {booking.room.name} has been approved. Please pay the remaining balance of ₱{remaining} within 24 hours.',
                            f'/booking/{booking.id}',
                        )

                elif new_status == BookingStatus.CANCELLED:
                    # Reverse voucher usage if any
                    try:
                        from vouchers.models import VoucherUsage
                        usage = VoucherUsage.objects.select_related('voucher').filter(booking=booking).first()
                        if usage:
                            with transaction.atomic():
                                v = usage.voucher
                                v.times_used = F('times_used') - 1
                                v.save(update_fields=['times_used'])
                                usage.delete()
                    except Exception:
                        pass

                    create_notification(
                        booking.user, 'booking_cancelled',
                        'Booking Cancelled',
                        f'Your booking for {booking.room.name} has been cancelled.',
                        f'/booking/{booking.id}',
                    )
                    send_booking_cancelled_email(booking.user, booking)
                    # Notify other staff
                    from accounts.models import notify_staff
                    notify_staff(
                        'booking_cancelled',
                        'Booking Cancelled by Admin',
                        f'{self.request.user.get_full_name() or self.request.user.username} cancelled booking #{booking.id} for {booking.room.name} ({booking.user.get_full_name() or booking.user.username}).',
                        '/admin-dashboard/bookings',
                        exclude_user=self.request.user,
                    )
                elif new_status == BookingStatus.COMPLETED:
                    create_notification(
                        booking.user, 'booking_completed',
                        'Booking Completed',
                        f'Your stay at {booking.room.name} is complete. Leave a review!',
                        f'/booking/{booking.id}',
                    )
                    send_booking_completed_email(booking.user, booking)
            except Exception:
                pass


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_receipt(request, pk):
    try:
        booking = Booking.objects.select_related('user', 'room').get(pk=pk)
    except Booking.DoesNotExist:
        return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Only allow the booking owner or staff to download
    if booking.user != request.user and not request.user.is_staff:
        return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    from django.http import FileResponse
    from .pdf import generate_booking_receipt_pdf

    pdf_buffer = generate_booking_receipt_pdf(booking)
    response = FileResponse(pdf_buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{booking.reference_code}-receipt.pdf"'
    return response
