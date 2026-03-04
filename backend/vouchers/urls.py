from django.urls import path
from . import views

urlpatterns = [
    path('validate/', views.validate_voucher),
    path('', views.voucher_list_create),
    path('<int:pk>/toggle/', views.voucher_toggle),
    path('<int:pk>/', views.voucher_delete),
]
