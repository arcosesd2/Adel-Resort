from django.db import models as db_models
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes, parser_classes, throttle_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

class AnalyticsRateThrottle(ScopedRateThrottle):
    scope = 'analytics'


from .models import Room, RoomImage
from .serializers import RoomSerializer, RoomListSerializer, RoomImageSerializer, AdminRoomSerializer
from .filters import RoomFilter
from bookings.models import Booking
from accounts.permissions import IsSuperAdmin
from accounts.models import log_activity
from django.db.models import Avg, Count, Q


@api_view(['GET'])
@permission_classes([AllowAny])
def featured_rooms(request):
    from content.models import SiteSettings
    settings = SiteSettings.load()

    if settings.featured_mode == 'manual':
        qs = Room.objects.filter(is_active=True, is_featured=True).prefetch_related('images')
    else:
        qs = Room.objects.filter(is_active=True).prefetch_related('images').annotate(
            avg_rating=Avg('reviews__rating', filter=Q(reviews__is_approved=True)),
            review_count=Count('reviews', filter=Q(reviews__is_approved=True)),
            booking_count=Count('bookings', filter=Q(bookings__status__in=['confirmed', 'completed'])),
        ).order_by('-avg_rating', '-booking_count', '-review_count', 'day_price')

    serializer = RoomListSerializer(qs[:6], many=True, context={'request': request})
    return Response(serializer.data)


class RoomListView(generics.ListAPIView):
    serializer_class = RoomListSerializer
    permission_classes = [AllowAny]
    filterset_class = RoomFilter

    def get_queryset(self):
        qs = Room.objects.filter(is_active=True).prefetch_related('images')

        # Filter by date availability
        avail_date = self.request.query_params.get('date')
        if avail_date:
            from collections import Counter
            bookings = Booking.objects.filter(
                status__in=['confirmed', 'pending'],
                check_in__lte=avail_date,
                check_out__gte=avail_date,
            ).values('room_id', 'slots')

            # Count booked slots per room for the given date
            room_slot_counts = {}
            for b in bookings:
                rid = b['room_id']
                if rid not in room_slot_counts:
                    room_slot_counts[rid] = Counter()
                for s in (b['slots'] or []):
                    if s.get('date') == avail_date:
                        room_slot_counts[rid][s['slot']] += 1

            # Exclude rooms where ALL possible slots are fully booked
            exclude_ids = []
            for room in qs:
                counts = room_slot_counts.get(room.id, Counter())
                max_rooms = room.max_rooms or 1
                if room.booking_mode == 'overnight':
                    if counts.get('overnight', 0) >= max_rooms:
                        exclude_ids.append(room.id)
                elif room.is_day_only:
                    if counts.get('day', 0) >= max_rooms:
                        exclude_ids.append(room.id)
                else:
                    day_full = counts.get('day', 0) >= max_rooms
                    night_full = counts.get('night', 0) >= max_rooms
                    if day_full and night_full:
                        exclude_ids.append(room.id)

            if exclude_ids:
                qs = qs.exclude(id__in=exclude_ids)

        return qs


class RoomDetailView(generics.RetrieveAPIView):
    queryset = Room.objects.filter(is_active=True).prefetch_related('images')
    serializer_class = RoomSerializer
    permission_classes = [AllowAny]


def _get_booked_slots(room):
    """Collect all booked slots for active bookings of a room."""
    bookings = Booking.objects.filter(
        room=room,
        status__in=['confirmed', 'pending']
    ).values('id', 'slots')

    booked_slots = []
    for booking in bookings:
        if booking['slots']:
            for slot in booking['slots']:
                booked_slots.append({**slot, 'booking_id': booking['id']})
    return booked_slots


@api_view(['GET'])
@permission_classes([AllowAny])
def room_availability(request, pk):
    try:
        room = Room.objects.get(pk=pk, is_active=True)
    except Room.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    return Response({
        'room_id': room.id,
        'room_name': room.name,
        'max_rooms': room.max_rooms,
        'booked_slots': _get_booked_slots(room),
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser])
def upload_room_images(request, pk):
    """Upload multiple images to a room. Auto-assigns order numbers."""
    try:
        room = Room.objects.get(pk=pk)
    except Room.DoesNotExist:
        return Response({'detail': 'Room not found.'}, status=status.HTTP_404_NOT_FOUND)

    files = request.FILES.getlist('images')
    if not files:
        return Response({'detail': 'No images provided.'}, status=status.HTTP_400_BAD_REQUEST)

    allowed_types = ['image/jpeg', 'image/png', 'image/webp']
    from PIL import Image
    for f in files:
        if f.content_type not in allowed_types:
            return Response({'detail': f'Invalid file type: {f.name}. Only JPEG, PNG, and WebP allowed.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if f.size > 10 * 1024 * 1024:
            return Response({'detail': f'File too large: {f.name}. Max 10MB per image.'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            img = Image.open(f)
            img.verify()
            f.seek(0)
        except Exception:
            return Response({'detail': f'File is not a valid image: {f.name}.'},
                            status=status.HTTP_400_BAD_REQUEST)

    # Auto-assign order starting from the current max
    max_order = room.images.aggregate(db_models.Max('order'))['order__max'] or 0
    is_first = not room.images.exists()

    created = []
    for i, f in enumerate(files):
        img = RoomImage.objects.create(
            room=room,
            image=f,
            alt_text=f'{room.name} photo',
            is_primary=(is_first and i == 0),
            order=max_order + i + 1,
        )
        created.append(img)

    try:
        from accounts.models import log_activity
        log_activity(request.user, 'room', f'Uploaded {len(files)} image(s) to "{room.name}"')
    except Exception:
        pass

    serializer = RoomImageSerializer(created, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def reorder_room_images(request, pk):
    """Reorder room images. Expects {"order": [{"id": 1, "order": 0}, ...]}"""
    try:
        room = Room.objects.get(pk=pk)
    except Room.DoesNotExist:
        return Response({'detail': 'Room not found.'}, status=status.HTTP_404_NOT_FOUND)

    order_data = request.data.get('order', [])
    if not order_data:
        return Response({'detail': 'No order data provided.'}, status=status.HTTP_400_BAD_REQUEST)

    for item in order_data:
        RoomImage.objects.filter(pk=item['id'], room=room).update(order=item['order'])

    try:
        from accounts.models import log_activity
        log_activity(request.user, 'room', f'Reordered images for "{room.name}"')
    except Exception:
        pass

    images = room.images.all()
    return Response(RoomImageSerializer(images, many=True, context={'request': request}).data)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def room_image_detail(request, pk, image_pk):
    """Update or delete a single room image."""
    try:
        image = RoomImage.objects.get(pk=image_pk, room_id=pk)
    except RoomImage.DoesNotExist:
        return Response({'detail': 'Image not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        room_name = image.room.name
        image.image.delete(save=False)
        image.delete()
        try:
            from accounts.models import log_activity
            log_activity(request.user, 'room', f'Deleted image from "{room_name}"')
        except Exception:
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH - update is_primary, alt_text, order
    if 'is_primary' in request.data:
        if request.data['is_primary']:
            RoomImage.objects.filter(room_id=pk).update(is_primary=False)
        image.is_primary = request.data['is_primary']
    if 'alt_text' in request.data:
        image.alt_text = request.data['alt_text']
    if 'order' in request.data:
        image.order = request.data['order']
    image.save()
    return Response(RoomImageSerializer(image, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([AllowAny])
@throttle_classes([AnalyticsRateThrottle])
def all_rooms_availability(request):
    rooms = Room.objects.filter(is_active=True).prefetch_related('images')
    result = []
    for room in rooms:
        result.append({
            'room_id': room.id,
            'room_name': room.name,
            'room_type': room.room_type,
            'booking_mode': room.booking_mode,
            'day_price': str(room.day_price),
            'night_price': str(room.night_price) if room.night_price else None,
            'is_day_only': room.is_day_only,
            'max_rooms': room.max_rooms,
            'booked_slots': _get_booked_slots(room),
        })

    return Response(result)


# ───── Admin Room CRUD ─────

@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def admin_room_list(request):
    rooms = Room.objects.all().prefetch_related('images')
    return Response(AdminRoomSerializer(rooms, many=True, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def admin_room_create(request):
    serializer = AdminRoomSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        log_activity(request.user, 'room', f'Created room: "{serializer.data["name"]}"')
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsSuperAdmin])
def admin_room_detail(request, pk):
    try:
        room = Room.objects.prefetch_related('images').get(pk=pk)
    except Room.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(AdminRoomSerializer(room, context={'request': request}).data)

    if request.method == 'DELETE':
        name = room.name
        room.is_active = False
        room.save()
        log_activity(request.user, 'room', f'Deactivated room: "{name}"')
        return Response({'detail': f'Room "{name}" deactivated.'})

    serializer = AdminRoomSerializer(room, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        log_activity(request.user, 'room', f'Updated room: "{room.name}"')
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
