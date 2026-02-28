from django import forms
from .models import Room
from .widgets import NewlineListWidget


class RoomAdminForm(forms.ModelForm):
    class Meta:
        model = Room
        fields = '__all__'
        widgets = {
            'amenities': NewlineListWidget(attrs={'rows': 8, 'cols': 40}),
        }

    def clean_amenities(self):
        raw = self.cleaned_data.get('amenities', '')
        if isinstance(raw, list):
            return raw
        if not raw or not raw.strip():
            return []
        return [line.strip() for line in raw.splitlines() if line.strip()]
