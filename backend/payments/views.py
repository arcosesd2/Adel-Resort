import stripe
import json
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from bookings.models import Booking, BookingStatus
from .models import Payment, PaymentStatus
from .serializers import CreatePaymentIntentSerializer

stripe.api_key = settings.STRIPE_SECRET_KEY


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_intent(request):
    serializer = CreatePaymentIntentSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    booking_id = serializer.validated_data['booking_id']
    try:
        booking = Booking.objects.get(pk=booking_id, user=request.user)
    except Booking.DoesNotExist:
        return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

    if booking.status == BookingStatus.CONFIRMED:
        return Response({'detail': 'Booking already paid.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        intent = stripe.PaymentIntent.create(
            amount=int(booking.total_price * 100),
            currency='usd',
            metadata={
                'booking_id': booking.id,
                'user_id': request.user.id,
            }
        )
        booking.stripe_payment_intent_id = intent['id']
        booking.save()

        return Response({
            'client_secret': intent['client_secret'],
            'payment_intent_id': intent['id'],
            'amount': booking.total_price,
        })
    except stripe.error.StripeError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
    webhook_secret = settings.STRIPE_WEBHOOK_SECRET

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except (ValueError, stripe.error.SignatureVerificationError):
        return HttpResponse(status=400)

    if event['type'] == 'payment_intent.succeeded':
        intent = event['data']['object']
        booking_id = intent['metadata'].get('booking_id')
        try:
            booking = Booking.objects.get(pk=booking_id)
            booking.status = BookingStatus.CONFIRMED
            booking.save()
            Payment.objects.update_or_create(
                booking=booking,
                defaults={
                    'stripe_payment_id': intent['id'],
                    'amount': intent['amount'] / 100,
                    'currency': intent['currency'],
                    'status': PaymentStatus.SUCCEEDED,
                }
            )
        except Booking.DoesNotExist:
            pass

    elif event['type'] == 'payment_intent.payment_failed':
        intent = event['data']['object']
        booking_id = intent['metadata'].get('booking_id')
        try:
            booking = Booking.objects.get(pk=booking_id)
            Payment.objects.update_or_create(
                booking=booking,
                defaults={
                    'stripe_payment_id': intent['id'],
                    'amount': intent['amount'] / 100,
                    'currency': intent['currency'],
                    'status': PaymentStatus.FAILED,
                }
            )
        except Booking.DoesNotExist:
            pass

    return HttpResponse(status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_payment(request, pk):
    try:
        booking = Booking.objects.get(pk=pk, user=request.user)
    except Booking.DoesNotExist:
        return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

    if not booking.stripe_payment_intent_id:
        return Response({'detail': 'No payment intent found.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        intent = stripe.PaymentIntent.retrieve(booking.stripe_payment_intent_id)
        if intent['status'] == 'succeeded':
            booking.status = BookingStatus.CONFIRMED
            booking.save()
            Payment.objects.update_or_create(
                booking=booking,
                defaults={
                    'stripe_payment_id': intent['id'],
                    'amount': intent['amount'] / 100,
                    'currency': intent['currency'],
                    'status': PaymentStatus.SUCCEEDED,
                }
            )
            return Response({'detail': 'Payment confirmed.', 'booking_id': booking.id})
        return Response({'detail': f'Payment status: {intent["status"]}'})
    except stripe.error.StripeError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
