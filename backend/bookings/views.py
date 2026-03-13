from decimal import Decimal

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from django.contrib.auth import get_user_model
from rooms.models import Room
from .models import Booking, BookingStatus
from .serializers import BookingSerializer

User = get_user_model()


class BookingListCreateView(generics.ListCreateAPIView):
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(user=self.request.user).select_related('room')


class BookingDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(user=self.request.user).select_related('room')

    def destroy(self, request, *args, **kwargs):
        booking = self.get_object()
        if booking.status == BookingStatus.CONFIRMED:
            return Response(
                {'detail': 'Cannot cancel a confirmed booking with payment. Contact support.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        booking.status = BookingStatus.CANCELLED
        booking.save()
        return Response({'detail': 'Booking cancelled.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def onsite_booking(request):
    """Create a booking for a walk-in guest. Staff-only."""
    data = request.data
    guest_name = data.get('guest_name', '').strip()
    guest_email = data.get('guest_email', '').strip()
    guest_phone = data.get('guest_phone', '').strip()
    room_id = data.get('room')
    guests = data.get('guests', 1)
    slots = data.get('slots', [])
    special_requests = data.get('special_requests', '')

    if not guest_name or not room_id or not slots:
        return Response({'detail': 'Guest name, room, and slots are required.'}, status=status.HTTP_400_BAD_REQUEST)

    # Parse guest name
    name_parts = guest_name.split(' ', 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ''

    # Find or create guest user
    if guest_email:
        user, created = User.objects.get_or_create(
            email=guest_email,
            defaults={
                'first_name': first_name,
                'last_name': last_name,
                'phone': guest_phone,
            }
        )
        if created:
            user.set_unusable_password()
            user.save()
    else:
        # Create a placeholder user with a generated email
        import uuid
        placeholder_email = f'walkin-{uuid.uuid4().hex[:8]}@onsite.local'
        user = User.objects.create(
            email=placeholder_email,
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
    if room.is_day_only and any(s.get('slot') == 'night' for s in slots):
        return Response({'detail': 'This accommodation is available for day tours only.'}, status=status.HTTP_400_BAD_REQUEST)

    slot_dates = [s['date'] for s in slots]
    min_date = min(slot_dates)
    max_date = max(slot_dates)

    existing = Booking.objects.filter(
        room=room, status__in=['confirmed', 'pending'],
        check_in__lte=max_date, check_out__gte=min_date,
    )
    booked_set = set()
    for b in existing:
        for s in b.slots:
            booked_set.add((s['date'], s['slot']))

    for s in slots:
        if (s['date'], s['slot']) in booked_set:
            return Response(
                {'detail': f"The {s['slot']} slot on {s['date']} is already booked."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # Calculate price
    day_price = room.day_price or Decimal('0')
    night_price = room.night_price or room.day_price
    total = sum(night_price if s['slot'] == 'night' else day_price for s in slots)

    booking = Booking.objects.create(
        user=user, room=room,
        check_in=min_date, check_out=max_date,
        guests=guests, slots=slots,
        total_price=total, status=BookingStatus.CONFIRMED,
        special_requests=special_requests,
    )

    return Response({
        'id': booking.id,
        'guest_name': guest_name,
        'room': room.name,
        'total_price': str(booking.total_price),
        'status': booking.status,
        'slots_summary': booking.slots_summary,
    }, status=status.HTTP_201_CREATED)
