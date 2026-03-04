from rest_framework import serializers


class TrackPageViewSerializer(serializers.Serializer):
    visitor_id = serializers.CharField(max_length=36)
    page_path = serializers.CharField(max_length=500)
