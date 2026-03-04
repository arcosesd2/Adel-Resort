from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.utils.dateparse import parse_datetime

from .models import Conversation, Message
from .serializers import (
    ConversationListSerializer,
    ConversationDetailSerializer,
    StartConversationSerializer,
    SendMessageSerializer,
    MessageSerializer,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_conversations(request):
    conversations = Conversation.objects.filter(customer=request.user)
    serializer = ConversationListSerializer(conversations, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_conversation(request):
    serializer = StartConversationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    conversation = Conversation.objects.create(
        customer=request.user,
        subject=serializer.validated_data['subject'],
    )
    Message.objects.create(
        conversation=conversation,
        sender=request.user,
        content=serializer.validated_data['message'],
        is_staff_reply=False,
    )
    detail = ConversationDetailSerializer(conversation, context={'request': request})
    return Response(detail.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversation_detail(request, pk):
    try:
        conversation = Conversation.objects.get(pk=pk)
    except Conversation.DoesNotExist:
        return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Only customer or staff can view
    if not request.user.is_staff and conversation.customer != request.user:
        return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    # Mark messages as read
    if request.user.is_staff:
        conversation.messages.filter(is_read=False, is_staff_reply=False).update(is_read=True)
    else:
        conversation.messages.filter(is_read=False, is_staff_reply=True).update(is_read=True)

    serializer = ConversationDetailSerializer(conversation, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message(request, pk):
    try:
        conversation = Conversation.objects.get(pk=pk)
    except Conversation.DoesNotExist:
        return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

    if not request.user.is_staff and conversation.customer != request.user:
        return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    if conversation.status == 'resolved':
        return Response({'detail': 'This conversation has been resolved.'}, status=status.HTTP_400_BAD_REQUEST)

    serializer = SendMessageSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    message = Message.objects.create(
        conversation=conversation,
        sender=request.user,
        content=serializer.validated_data['content'],
        is_staff_reply=request.user.is_staff,
    )
    # Update conversation timestamp
    conversation.save(update_fields=['updated_at'])

    return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def poll_messages(request, pk):
    try:
        conversation = Conversation.objects.get(pk=pk)
    except Conversation.DoesNotExist:
        return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

    if not request.user.is_staff and conversation.customer != request.user:
        return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    since = request.query_params.get('since')
    messages = conversation.messages.all()
    if since:
        dt = parse_datetime(since)
        if dt:
            messages = messages.filter(created_at__gt=dt)

    serializer = MessageSerializer(messages, many=True)
    return Response(serializer.data)


# ── Admin endpoints ──

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_conversations(request):
    status_filter = request.query_params.get('status')
    conversations = Conversation.objects.all()
    if status_filter in ('open', 'resolved'):
        conversations = conversations.filter(status=status_filter)
    serializer = ConversationListSerializer(conversations, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def resolve_conversation(request, pk):
    try:
        conversation = Conversation.objects.get(pk=pk)
    except Conversation.DoesNotExist:
        return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)
    conversation.status = 'resolved'
    conversation.save(update_fields=['status', 'updated_at'])
    return Response(ConversationListSerializer(conversation, context={'request': request}).data)
