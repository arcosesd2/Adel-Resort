from django.urls import path
from . import views

urlpatterns = [
    path('submit-proof/', views.submit_proof_of_payment, name='submit-proof'),
]
