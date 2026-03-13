from django.urls import path
from .views import NewsListView, EventListView, PromotionListView, PricingListView

urlpatterns = [
    path('news/', NewsListView.as_view(), name='news-list'),
    path('events/', EventListView.as_view(), name='event-list'),
    path('promotions/', PromotionListView.as_view(), name='promotion-list'),
    path('pricing/', PricingListView.as_view(), name='pricing-list'),
]
