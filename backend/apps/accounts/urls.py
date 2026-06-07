"""Accounts URLs"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from .views import OAuthSuccessView

urlpatterns = [
    path('me/', views.MeView.as_view(), name='me'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('oauth/callback/', views.OAuthCallbackView.as_view(), name='oauth-callback'),
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
    path('oauth-success/', OAuthSuccessView.as_view(), name='oauth-success'),
]


