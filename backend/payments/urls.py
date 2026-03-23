from django.urls import path
from . import views

urlpatterns = [
    path('submit-proof/', views.submit_proof_of_payment, name='submit-proof'),
    path('gcash-config/', views.gcash_config, name='gcash-config'),
    path('gcash-config/update/', views.gcash_config_update, name='gcash-config-update'),
]
