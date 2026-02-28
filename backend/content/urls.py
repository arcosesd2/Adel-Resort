from django.urls import path
from .views import EventListView, PromotionListView, PricingListView

urlpatterns = [
    path('events/', EventListView.as_view(), name='event-list'),
    path('promotions/', PromotionListView.as_view(), name='promotion-list'),
    path('pricing/', PricingListView.as_view(), name='pricing-list'),
]
