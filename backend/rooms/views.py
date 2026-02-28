from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Room
from .serializers import RoomSerializer, RoomListSerializer
from .filters import RoomFilter
from bookings.models import Booking


class RoomListView(generics.ListAPIView):
    serializer_class = RoomListSerializer
    permission_classes = [AllowAny]
    filterset_class = RoomFilter

    def get_queryset(self):
        return Room.objects.filter(is_active=True).prefetch_related('images')


class RoomDetailView(generics.RetrieveAPIView):
    queryset = Room.objects.filter(is_active=True).prefetch_related('images')
    serializer_class = RoomSerializer
    permission_classes = [AllowAny]


@api_view(['GET'])
@permission_classes([AllowAny])
def room_availability(request, pk):
    try:
        room = Room.objects.get(pk=pk, is_active=True)
    except Room.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    bookings = Booking.objects.filter(
        room=room,
        status__in=['confirmed', 'pending']
    ).values('check_in', 'check_out')

    booked_ranges = [
        {'check_in': str(b['check_in']), 'check_out': str(b['check_out'])}
        for b in bookings
    ]

    return Response({
        'room_id': room.id,
        'room_name': room.name,
        'booked_ranges': booked_ranges,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def all_rooms_availability(request):
    rooms = Room.objects.filter(is_active=True).prefetch_related('images')
    result = []
    for room in rooms:
        bookings = Booking.objects.filter(
            room=room,
            status__in=['confirmed', 'pending']
        ).values('check_in', 'check_out')

        result.append({
            'room_id': room.id,
            'room_name': room.name,
            'room_type': room.room_type,
            'day_price': str(room.day_price),
            'night_price': str(room.night_price) if room.night_price else None,
            'is_day_only': room.is_day_only,
            'booked_ranges': [
                {'check_in': str(b['check_in']), 'check_out': str(b['check_out'])}
                for b in bookings
            ],
        })

    return Response(result)
