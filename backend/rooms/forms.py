import json
from django import forms
from .models import Room
from .widgets import NewlineListWidget


class RoomAdminForm(forms.ModelForm):
    amenities = forms.CharField(
        widget=NewlineListWidget(attrs={'rows': 8, 'cols': 40}),
        required=False,
        help_text='Enter one amenity per line.',
    )

    class Meta:
        model = Room
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            value = self.instance.amenities
            if isinstance(value, list):
                self.initial['amenities'] = '\n'.join(value)
            elif isinstance(value, str):
                try:
                    parsed = json.loads(value)
                    if isinstance(parsed, list):
                        self.initial['amenities'] = '\n'.join(parsed)
                except (json.JSONDecodeError, TypeError):
                    self.initial['amenities'] = value

    def clean_amenities(self):
        raw = self.cleaned_data.get('amenities', '')
        if not raw or not raw.strip():
            return []
        return [line.strip() for line in raw.splitlines() if line.strip()]
