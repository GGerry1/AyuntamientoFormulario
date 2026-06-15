"""Accounts Views"""
from django.conf import settings
from django.middleware.csrf import get_token
from django.shortcuts import redirect as django_redirect
from django.views import View
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .authentication import enforce_csrf
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


class LogoutView(APIView):
    """Blacklist refresh token on logout."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        response = Response({'detail': 'Sesión cerrada.'}, status=status.HTTP_200_OK)
        try:
            refresh_token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
            if refresh_token:
                RefreshToken(refresh_token).blacklist()
        except Exception:
            pass
        clear_auth_cookies(response)
        return response


class CsrfTokenView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({'csrfToken': get_token(request)})


class CookieTokenRefreshView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        enforce_csrf(request)
        refresh_token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if not refresh_token:
            return Response(
                {'detail': 'No hay una sesión renovable.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = TokenRefreshSerializer(data={'refresh': refresh_token})
        serializer.is_valid(raise_exception=True)
        response = Response({'detail': 'Sesión renovada.'})
        set_auth_cookies(
            response,
            serializer.validated_data['access'],
            serializer.validated_data.get('refresh', refresh_token),
        )
        return response


class DashboardStatsView(APIView):
    """Quick stats for the dashboard header."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.courses.models import Course, CourseRegistration

        admin = request.user
        total_cursos = Course.objects.filter(administrador=admin).count()
        total_inscritos = CourseRegistration.objects.filter(
            administrador=admin
        ).count()
        completaron = CourseRegistration.objects.filter(
            administrador=admin, completado=True
        ).count()

        return Response({
            'total_cursos': total_cursos,
            'total_inscritos': total_inscritos,
            'completaron': completaron,
            'pendientes': total_inscritos - completaron,
        })

class OAuthSuccessView(View):

    def get(self, request):
        if not request.user.is_authenticated:
            return django_redirect(
                f"{settings.SITE_BASE_URL}/admin?error=auth_failed"
            )

        refresh = RefreshToken.for_user(request.user)

        response = django_redirect(f"{settings.SITE_BASE_URL}/auth/callback")
        set_auth_cookies(response, str(refresh.access_token), str(refresh))
        return response


def set_auth_cookies(response, access_token, refresh_token):
    common = {
        'httponly': True,
        'secure': settings.JWT_COOKIE_SECURE,
        'samesite': settings.JWT_COOKIE_SAMESITE,
    }
    response.set_cookie(
        settings.JWT_ACCESS_COOKIE_NAME,
        access_token,
        max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
        path='/',
        **common,
    )
    response.set_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
        path='/api/v1/auth/',
        **common,
    )


def clear_auth_cookies(response):
    response.delete_cookie(
        settings.JWT_ACCESS_COOKIE_NAME,
        path='/',
        samesite=settings.JWT_COOKIE_SAMESITE,
    )
    response.delete_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        path='/api/v1/auth/',
        samesite=settings.JWT_COOKIE_SAMESITE,
    )
