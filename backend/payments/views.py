from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from bookings.models import Booking, BookingStatus
from .models import Payment, PaymentStatus
from .serializers import SubmitProofSerializer


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

    if hasattr(booking, 'payment'):
        return Response({'detail': 'Payment proof already submitted.'}, status=status.HTTP_400_BAD_REQUEST)

    Payment.objects.create(
        booking=booking,
        gcash_reference=serializer.validated_data['gcash_reference'],
        proof_of_payment=serializer.validated_data['proof_of_payment'],
        amount=booking.total_price,
        currency='php',
        status=PaymentStatus.PENDING,
    )

    return Response({'detail': 'Payment proof submitted. Awaiting admin confirmation.'}, status=status.HTTP_201_CREATED)
