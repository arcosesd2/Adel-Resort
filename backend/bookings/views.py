from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Booking, BookingStatus
from .serializers import BookingSerializer


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
