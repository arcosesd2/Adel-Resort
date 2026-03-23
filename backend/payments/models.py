from django.db import models


class PaymentStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    SUCCEEDED = 'succeeded', 'Succeeded'
    FAILED = 'failed', 'Failed'
    REFUNDED = 'refunded', 'Refunded'


class PaymentType(models.TextChoices):
    FULL = 'full', 'Full Payment'
    DOWNPAYMENT = 'downpayment', '20% Downpayment'


class Payment(models.Model):
    booking = models.OneToOneField('bookings.Booking', on_delete=models.CASCADE, related_name='payment')
    gcash_reference = models.CharField(max_length=200, blank=True, default='')
    proof_of_payment = models.ImageField(upload_to='payment_proofs/', blank=True)
    payment_type = models.CharField(max_length=20, choices=PaymentType.choices, default=PaymentType.FULL)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='php')
    status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Payment for Booking #{self.booking_id} - {self.status}'


class GCashConfig(models.Model):
    gcash_number = models.CharField(max_length=30)
    account_name = models.CharField(max_length=200)
    qr_code = models.ImageField(upload_to='gcash/')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'GCash Configuration'
        verbose_name_plural = 'GCash Configuration'

    def __str__(self):
        return f'GCash - {self.account_name} ({self.gcash_number})'

    def save(self, *args, **kwargs):
        # Singleton: always use pk=1
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(
            pk=1,
            defaults={'gcash_number': '0916 315 2117', 'account_name': 'Ralph Arcos'},
        )
        return obj
