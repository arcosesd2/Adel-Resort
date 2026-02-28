import json
from django import forms


class NewlineListWidget(forms.Textarea):
    """Textarea widget that converts a JSON list to/from newline-separated text."""

    def format_value(self, value):
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        if isinstance(value, list):
            return '\n'.join(str(item) for item in value)
        return value or ''
