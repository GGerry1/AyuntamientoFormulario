from types import SimpleNamespace

from django.template.loader import render_to_string
from django.test import Client, RequestFactory, SimpleTestCase, TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Administrator


@override_settings(SITE_BASE_URL='https://frontend.example.com')
class SocialLoginTemplateTests(SimpleTestCase):
    def test_microsoft_confirmation_uses_institutional_template(self):
        request = RequestFactory().get('/accounts/microsoft/login/')

        html = render_to_string(
            'socialaccount/login.html',
            {
                'process': 'login',
                'provider': SimpleNamespace(
                    id='microsoft',
                    name='Microsoft Graph',
                ),
            },
            request=request,
        )

        self.assertIn('Confirmar inicio de sesion', html)
        self.assertIn('Continuar con', html)
        self.assertIn('Microsoft', html)
        self.assertNotIn('Microsoft Graph', html)
        self.assertIn('https://frontend.example.com/logo-acapulco.png', html)
        self.assertIn('<form method="post">', html)
        self.assertNotIn('<strong>Menu:', html)


@override_settings(
    SITE_BASE_URL='https://frontend.example.com',
    JWT_COOKIE_SECURE=True,
    JWT_COOKIE_SAMESITE='None',
)
class OAuthCookieSecurityTests(TestCase):
    def test_oauth_success_uses_http_only_cookies_and_clean_redirect(self):
        user = Administrator.objects.create_user(email='admin@example.com')
        client = Client()
        client.force_login(user)

        response = client.get(reverse('oauth-success'))

        self.assertEqual(
            response['Location'],
            'https://frontend.example.com/auth/callback',
        )
        self.assertNotIn('access=', response['Location'])
        self.assertNotIn('refresh=', response['Location'])
        self.assertTrue(response.cookies['access-token']['httponly'])
        self.assertTrue(response.cookies['refresh-token']['httponly'])
        self.assertEqual(response.cookies['access-token']['samesite'], 'None')
        self.assertEqual(response.cookies['access-token']['max-age'], '')
        self.assertEqual(response.cookies['refresh-token']['max-age'], '')

    def test_cookie_authenticated_writes_require_csrf(self):
        user = Administrator.objects.create_user(email='csrf@example.com')
        access = str(RefreshToken.for_user(user).access_token)
        client = APIClient(enforce_csrf_checks=True)
        client.cookies['access-token'] = access

        rejected = client.patch(
            reverse('me'),
            {'nombre': 'Sin CSRF'},
            format='json',
        )
        csrf_response = client.get(reverse('csrf-token'))
        accepted = client.patch(
            reverse('me'),
            {'nombre': 'Con CSRF'},
            format='json',
            HTTP_X_CSRFTOKEN=csrf_response.data['csrfToken'],
        )

        self.assertEqual(rejected.status_code, 403)
        self.assertEqual(accepted.status_code, 200)

    def test_refresh_reads_http_only_cookie_and_sets_new_access_cookie(self):
        user = Administrator.objects.create_user(email='refresh@example.com')
        refresh = str(RefreshToken.for_user(user))
        client = APIClient(enforce_csrf_checks=True)
        client.cookies['refresh-token'] = refresh
        csrf_response = client.get(reverse('csrf-token'))

        response = client.post(
            reverse('token-refresh'),
            {},
            format='json',
            HTTP_X_CSRFTOKEN=csrf_response.data['csrfToken'],
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('access-token', response.cookies)
        self.assertTrue(response.cookies['access-token']['httponly'])
