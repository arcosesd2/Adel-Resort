from rest_framework import serializers
from hr.models import PayRateConfig


class PayRateConfigSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, default=None)

    class Meta:
        model = PayRateConfig
        fields = [
            'id', 'effective_from',
            'ot_ordinary_pct', 'ot_rest_day_pct', 'ot_regular_holiday_pct', 'ot_special_holiday_pct',
            'ot_rest_day_regular_holiday_pct', 'ot_rest_day_special_holiday_pct',
            'regular_holiday_rate_pct', 'special_holiday_rate_pct', 'rest_day_rate_pct',
            'rest_day_regular_holiday_rate_pct', 'rest_day_special_holiday_rate_pct',
            'night_diff_ordinary_pct', 'night_diff_rest_day_pct', 'night_diff_holiday_pct',
            'late_deduction_multiplier_pct', 'undertime_deduction_multiplier_pct',
            'created_by_username', 'created_at',
        ]
        read_only_fields = ['id', 'created_by_username', 'created_at']
