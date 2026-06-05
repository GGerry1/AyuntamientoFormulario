"""Courses URLs - Updated"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CourseViewSet, CourseFormFieldViewSet,
    PublicInscriptionView, AdminStatisticsView, RegistrationDetailView,
    PublicCourseReportView, CourseNameStatsView, PublicCourseNameReportView,
    RegistrationsByCourseNameView, ToggleCompletadoView, SendDiplomaView,
)

router = DefaultRouter()
router.register(r'', CourseViewSet, basename='course')

urlpatterns = [
    # Public (QR access) - must be before router
    path('inscripcion/<uuid:qr_token>/', PublicInscriptionView.as_view(), name='public-inscription'),

    # Admin stats with optional ?nombre_curso= filter
    path('admin-stats/', AdminStatisticsView.as_view(), name='admin-statistics'),

    # Public shareable report (no auth)
    path('public-report/<uuid:course_id>/', PublicCourseReportView.as_view(), name='public-report'),
    # Stats by curso name (authenticated)
    path('stats-by-name/<str:nombre_curso>/', CourseNameStatsView.as_view(), name='stats-by-name'),
    # Public report by curso name
    path('public-report-name/<str:nombre_curso>/', PublicCourseNameReportView.as_view(), name='public-report-name'),

    # Registration detail/update
    path('registrations/<uuid:pk>/', RegistrationDetailView.as_view(), name='registration-detail'),

    # Registrations by curso name
    path('registrations-by-course/<str:nombre_curso>/', RegistrationsByCourseNameView.as_view(), name='registrations-by-course'),  # GET + DELETE

    # Toggle completado
    path('registrations/<uuid:pk>/toggle-completado/', ToggleCompletadoView.as_view(), name='toggle-completado'),

    # Send diploma
    path('registrations/<uuid:pk>/send-diploma/', SendDiplomaView.as_view(), name='send-diploma'),

    # Nested form fields: /courses/{id}/form-fields/
    path('<uuid:course_pk>/form-fields/', include([
        path('', CourseFormFieldViewSet.as_view({'get': 'list', 'post': 'create'})),
        path('<uuid:pk>/', CourseFormFieldViewSet.as_view({
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update',
            'delete': 'destroy',
        })),
    ])),

    # Course CRUD + custom actions (toggle_active, registrations, statistics, course_names)
    path('', include(router.urls)),
]
