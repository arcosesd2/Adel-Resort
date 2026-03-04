from django.urls import path
from . import views

urlpatterns = [
    path('conversations/', views.my_conversations),
    path('conversations/start/', views.start_conversation),
    path('conversations/<int:pk>/', views.conversation_detail),
    path('conversations/<int:pk>/send/', views.send_message),
    path('conversations/<int:pk>/poll/', views.poll_messages),
    path('admin/conversations/', views.admin_conversations),
    path('admin/conversations/<int:pk>/resolve/', views.resolve_conversation),
]
