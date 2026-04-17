from rest_framework import serializers
from hr.models import Holiday


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = ['id', 'date', 'name', 'holiday_type', 'is_recurring']
        read_only_fields = ['id']
