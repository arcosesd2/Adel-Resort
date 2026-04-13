from decimal import Decimal
from datetime import date
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from bookings.models import Booking
from content.models import Promotion
from content.serializers import PromotionSerializer
from .models import Voucher
from .serializers import VoucherSerializer, VoucherValidateSerializer
from .utils import get_booking_voucher_validity_status


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

    if not voucher.is_active:
        return Response({'detail': 'This voucher is no longer active.'}, status=status.HTTP_400_BAD_REQUEST)

    booking_dates = [slot['date'] for slot in booking.slots] if booking.slots else [booking.check_in]
    room_type = booking.room.room_type

    applied_promo_id = request.data.get('promotion_id')
    if applied_promo_id:
        try:
            promo = Promotion.objects.get(pk=applied_promo_id, is_active=True)
            if not promo.allows_voucher:
                return Response({'detail': 'This promotion cannot be combined with a voucher.'}, status=status.HTTP_400_BAD_REQUEST)
        except Promotion.DoesNotExist:
            pass

    validity_status = get_booking_voucher_validity_status(voucher, booking_dates)
    if validity_status == 'not_yet_valid':
        return Response({'detail': 'This voucher is not yet valid.'}, status=status.HTTP_400_BAD_REQUEST)
    if validity_status == 'expired':
        return Response({'detail': 'This voucher has expired.'}, status=status.HTTP_400_BAD_REQUEST)
    if voucher.max_uses is not None and voucher.times_used >= voucher.max_uses:
        return Response({'detail': 'This voucher has reached its maximum uses.'}, status=status.HTTP_400_BAD_REQUEST)

    total = booking.total_price

    promo_discount = Decimal('0')
    if applied_promo_id:
        try:
            promo = Promotion.objects.get(pk=applied_promo_id, is_active=True)
            if _is_promotion_applicable(promo, booking_dates, room_type):
                promo_discount = _calc_promo_discount(promo, total)
        except Promotion.DoesNotExist:
            pass
    price_after_promo = total - promo_discount

    if voucher.min_booking_amount and price_after_promo < voucher.min_booking_amount:
        return Response(
            {'detail': f'Minimum booking amount of \u20b1{voucher.min_booking_amount} required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if voucher.discount_type == 'percentage':
        discount = (price_after_promo * voucher.discount_value / Decimal('100')).quantize(Decimal('0.01'))
        discount = min(discount, price_after_promo)
    else:
        discount = min(voucher.discount_value, price_after_promo)

    final_price = price_after_promo - discount

    return Response({
        'valid': True,
        'code': voucher.code,
        'discount_type': voucher.discount_type,
        'discount_value': str(voucher.discount_value),
        'discount_amount': str(discount),
        'original_price': str(total),
        'promotion_discount': str(promo_discount),
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
    voucher = serializer.save(code=serializer.validated_data['code'].upper())
    try:
        from accounts.models import log_activity
        log_activity(request.user, 'voucher', f'Created voucher "{voucher.code}"')
    except Exception:
        pass
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
    try:
        from accounts.models import log_activity
        state = 'activated' if voucher.is_active else 'deactivated'
        log_activity(request.user, 'voucher', f'{state.capitalize()} voucher "{voucher.code}"')
    except Exception:
        pass
    return Response(VoucherSerializer(voucher).data)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def voucher_delete(request, pk):
    try:
        voucher = Voucher.objects.get(pk=pk)
    except Voucher.DoesNotExist:
        return Response({'detail': 'Voucher not found.'}, status=status.HTTP_404_NOT_FOUND)
    code = voucher.code
    voucher.delete()
    try:
        from accounts.models import log_activity
        log_activity(request.user, 'voucher', f'Deleted voucher "{code}"')
    except Exception:
        pass
    return Response(status=status.HTTP_204_NO_CONTENT)


def _is_promotion_applicable(promo, booking_dates, room_type):
    if not promo.is_active:
        return False
    if promo.room_types and room_type not in promo.room_types:
        return False
    today = date.today()
    if promo.schedule_type == 'duration':
        if promo.valid_from and today < promo.valid_from:
            return False
        if promo.valid_until and today > promo.valid_until:
            return False
    elif promo.schedule_type == 'recurring':
        if promo.applicable_days:
            booking_weekdays = set()
            for d in booking_dates:
                try:
                    parsed = date.fromisoformat(d) if isinstance(d, str) else d
                    booking_weekdays.add(parsed.weekday())
                except (ValueError, TypeError):
                    pass
            if not booking_weekdays.intersection(set(promo.applicable_days)):
                return False
    if promo.min_booking_amount:
        pass
    return True


def _calc_promo_discount(promo, total):
    if promo.discount_type == 'percentage':
        discount = (total * promo.discount_value / Decimal('100')).quantize(Decimal('0.01'))
        return min(discount, total)
    return min(promo.discount_value, total)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def applicable_promotions(request):
    booking_id = request.query_params.get('booking_id')
    if not booking_id:
        return Response({'detail': 'booking_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        booking = Booking.objects.get(pk=booking_id, user=request.user)
    except Booking.DoesNotExist:
        return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

    booking_dates = [slot['date'] for slot in booking.slots] if booking.slots else [booking.check_in.isoformat()]
    room_type = booking.room.room_type
    total = booking.total_price

    promos = Promotion.objects.filter(is_active=True)
    results = []
    for promo in promos:
        if not _is_promotion_applicable(promo, booking_dates, room_type):
            continue
        if promo.min_booking_amount and total < promo.min_booking_amount:
            continue
        discount = _calc_promo_discount(promo, total)
        results.append({
            'id': promo.id,
            'title': promo.title,
            'description': promo.description,
            'discount_type': promo.discount_type,
            'discount_value': str(promo.discount_value),
            'discount_amount': str(discount),
            'schedule_type': promo.schedule_type,
            'applicable_days': promo.applicable_days,
            'room_types': promo.room_types,
            'allows_voucher': promo.allows_voucher,
            'final_price': str(total - discount),
        })

    return Response(results)
