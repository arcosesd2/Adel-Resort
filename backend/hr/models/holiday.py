from django.db import models


class Holiday(models.Model):
    class HolidayType(models.TextChoices):
        REGULAR = 'regular', 'Regular Holiday'
        SPECIAL_NON_WORKING = 'special_non_working', 'Special Non-Working Holiday'
        SPECIAL_WORKING = 'special_working', 'Special Working Holiday'

    date = models.DateField(unique=True)
    name = models.CharField(max_length=200)
    holiday_type = models.CharField(
        max_length=30, choices=HolidayType.choices, default=HolidayType.REGULAR,
    )
    is_recurring = models.BooleanField(
        default=False,
        help_text='Repeats every year on the same month/day.',
    )

    class Meta:
        ordering = ['date']

    def __str__(self):
        return f'{self.date} - {self.name} ({self.get_holiday_type_display()})'
