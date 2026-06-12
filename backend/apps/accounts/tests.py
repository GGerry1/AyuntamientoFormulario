from types import SimpleNamespace

from django.template.loader import render_to_string
from django.test import RequestFactory, SimpleTestCase, override_settings


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
