"""Accounts Views"""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Administrator
from .serializers import AdministratorSerializer, AdministratorUpdateSerializer


class MeView(generics.RetrieveUpdateAPIView):
    """Get and update current administrator profile."""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return AdministratorUpdateSerializer
        return AdministratorSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)


class OAuthCallbackView(APIView):
    """
    Called after successful OAuth redirect.
    Returns JWT tokens to frontend.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({'detail': 'No autenticado.'}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': AdministratorSerializer(user).data,
        })


class LogoutView(APIView):
    """Blacklist refresh token on logout."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'detail': 'Sesión cerrada.'}, status=status.HTTP_200_OK)
        except Exception:
            return Response({'detail': 'Token inválido.'}, status=status.HTTP_400_BAD_REQUEST)


class DashboardStatsView(APIView):
    """Quick stats for the dashboard header."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.courses.models import Course, CourseRegistration

        admin = request.user
        total_cursos = Course.objects.filter(administrador=admin).count()
        total_inscritos = CourseRegistration.objects.filter(
            course__administrador=admin
        ).count()
        completaron = CourseRegistration.objects.filter(
            course__administrador=admin, completado=True
        ).count()

        return Response({
            'total_cursos': total_cursos,
            'total_inscritos': total_inscritos,
            'completaron': completaron,
            'pendientes': total_inscritos - completaron,
        })

from django.shortcuts import redirect as django_redirect
from django.views import View

class OAuthSuccessView(View):
    """Emite JWT y redirige al frontend con los tokens en la URL."""
    def get(self, request):
        from django.conf import settings
        user = request.user
        if not user.is_authenticated:
            return django_redirect(f"{settings.SITE_BASE_URL}/admin?error=auth_failed")
        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)
        ref = str(refresh)
        return django_redirect(
            f"{settings.SITE_BASE_URL}/auth/callback?access={access}&refresh={ref}"
        )