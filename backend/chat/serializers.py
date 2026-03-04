from rest_framework import serializers
from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)

    class Meta:
        model = Message
        fields = ('id', 'sender', 'sender_name', 'content', 'is_staff_reply', 'is_read', 'created_at')
        read_only_fields = ('id', 'sender', 'sender_name', 'is_staff_reply', 'is_read', 'created_at')


class ConversationListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ('id', 'customer', 'customer_name', 'subject', 'status', 'created_at', 'updated_at', 'last_message', 'unread_count')
        read_only_fields = fields

    def get_last_message(self, obj):
        msg = obj.messages.order_by('-created_at').first()
        if msg:
            return {'content': msg.content, 'is_staff_reply': msg.is_staff_reply, 'created_at': msg.created_at}
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            return 0
        user = request.user
        if user.is_staff:
            return obj.messages.filter(is_read=False, is_staff_reply=False).count()
        return obj.messages.filter(is_read=False, is_staff_reply=True).count()


class ConversationDetailSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = ('id', 'customer', 'customer_name', 'subject', 'status', 'created_at', 'updated_at', 'messages')
        read_only_fields = fields


class StartConversationSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=200)
    message = serializers.CharField()


class SendMessageSerializer(serializers.Serializer):
    content = serializers.CharField()
