"""Diplomas URLs"""
from django.urls import path
from . import views

urlpatterns = [
    path('<uuid:registration_pk>/upload/', views.DiplomaUploadView.as_view(), name='diploma-upload'),
]
