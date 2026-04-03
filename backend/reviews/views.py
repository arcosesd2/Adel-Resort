from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from accounts.permissions import IsSuperAdmin
from bookings.models import Booking
from .models import Review
from .serializers import ReviewSerializer, CreateReviewSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def room_reviews(request, room_id):
    """Public: approved reviews for a room."""
    reviews = Review.objects.filter(room_id=room_id, is_approved=True)
    serializer = ReviewSerializer(reviews, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_review(request):
    """Authenticated user creates a review for a completed booking."""
    ser = CreateReviewSerializer(data=request.data)
    ser.is_valid(raise_exception=True)

    booking = get_object_or_404(Booking, id=ser.validated_data['booking_id'])

    if booking.user != request.user:
        return Response({'error': 'Not your booking.'}, status=status.HTTP_403_FORBIDDEN)

    if booking.status != 'completed':
        return Response({'error': 'Booking must be completed before reviewing.'}, status=status.HTTP_400_BAD_REQUEST)

    if hasattr(booking, 'review'):
        return Response({'error': 'You already reviewed this booking.'}, status=status.HTTP_400_BAD_REQUEST)

    review = Review.objects.create(
        booking=booking,
        user=request.user,
        room=booking.room,
        rating=ser.validated_data['rating'],
        comment=ser.validated_data['comment'],
    )
    return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_reviews(request):
    """Authenticated user's own reviews."""
    reviews = Review.objects.filter(user=request.user)
    serializer = ReviewSerializer(reviews, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def admin_reviews(request):
    """Super admin: all reviews."""
    reviews = Review.objects.select_related('user', 'room', 'booking').all()
    serializer = ReviewSerializer(reviews, many=True)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsSuperAdmin])
def toggle_approval(request, pk):
    """Super admin: toggle review approval."""
    review = get_object_or_404(Review, pk=pk)
    review.is_approved = not review.is_approved
    review.save(update_fields=['is_approved'])

    if review.is_approved:
        try:
            from accounts.models import create_notification
            create_notification(
                review.user, 'review_approved',
                'Review Published',
                f'Your review for {review.room.name} has been approved and is now visible.',
                f'/rooms/{review.room.id}',
            )
        except Exception:
            pass

    return Response(ReviewSerializer(review).data)
