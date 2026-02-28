from django.db import models


class PaymentStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    SUCCEEDED = 'succeeded', 'Succeeded'
    FAILED = 'failed', 'Failed'
    REFUNDED = 'refunded', 'Refunded'


class Payment(models.Model):
    booking = models.OneToOneField('bookings.Booking', on_delete=models.CASCADE, related_name='payment')
    gcash_reference = models.CharField(max_length=200, blank=True, default='')
    proof_of_payment = models.ImageField(upload_to='payment_proofs/', blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='php')
    status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Payment for Booking #{self.booking_id} - {self.status}'
