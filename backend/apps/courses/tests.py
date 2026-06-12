from io import StringIO
from importlib import import_module
from unittest.mock import Mock, patch

from django.apps import apps as django_apps
from django.core.management import call_command
from django.test import SimpleTestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Administrator
from .models import Course, CourseRegistration, FieldOption
from .notifications import send_registration_confirmation
from .sendgrid_service import send_email, send_email_with_attachment

create_institutional_templates = import_module(
    'apps.courses.migrations.0008_seed_institutional_templates'
).create_templates


@override_settings(
    DEFAULT_FROM_EMAIL='verified@example.com',
    SENDGRID_API_KEY='test-api-key',
)
class SendGridServiceTests(SimpleTestCase):
    @patch('apps.courses.sendgrid_service.SendGridAPIClient')
    def test_sends_plain_email_through_web_api(self, client_class):
        client_class.return_value.send.return_value = Mock(status_code=202)

        response = send_email(
            to_email='recipient@example.com',
            subject='Confirmación',
            body='Inscripción exitosa.',
        )

        self.assertEqual(response.status_code, 202)
        client_class.return_value.send.assert_called_once()

    @patch('apps.courses.sendgrid_service.SendGridAPIClient')
    def test_sends_attachment_through_web_api(self, client_class):
        client_class.return_value.send.return_value = Mock(status_code=202)

        response = send_email_with_attachment(
            to_email='recipient@example.com',
            subject='Diploma',
            body='Adjunto diploma.',
            filename='diploma.pdf',
            content=b'pdf-content',
            content_type='application/pdf',
        )

        self.assertEqual(response.status_code, 202)
        client_class.assert_called_once_with('test-api-key')
        client_class.return_value.send.assert_called_once()

    @patch('apps.courses.sendgrid_service.SendGridAPIClient')
    def test_rejects_unsuccessful_sendgrid_response(self, client_class):
        client_class.return_value.send.return_value = Mock(status_code=400)

        with self.assertRaisesRegex(RuntimeError, 'estado 400'):
            send_email_with_attachment(
                to_email='recipient@example.com',
                subject='Diploma',
                body='Adjunto diploma.',
                filename='diploma.pdf',
                content=b'pdf-content',
                content_type='application/pdf',
            )


class RegistrationNotificationTests(SimpleTestCase):
    @patch('apps.courses.notifications.send_email')
    def test_confirmation_contains_selected_course_name(self, send_email_mock):
        registration = Mock(
            nombre_participante='Gerardo Salinas',
            email_participante='gerardo@example.com',
            nombre_curso_snapshot='Ciberseguridad',
        )

        send_registration_confirmation(registration)

        send_email_mock.assert_called_once()
        call = send_email_mock.call_args.kwargs
        self.assertEqual(call['to_email'], 'gerardo@example.com')
        self.assertIn('Ciberseguridad', call['subject'])
        self.assertIn('ha sido registrada exitosamente', call['body'])
        self.assertIn('H. Ayuntamiento de Acapulco de Juárez', call['body'])

    @patch('apps.courses.sendgrid_service.SendGridAPIClient')
    def test_reports_sendgrid_api_error_message(self, client_class):
        error = Exception('HTTP Error 403')
        error.body = b'{"errors":[{"message":"The from address is not verified"}]}'
        client_class.return_value.send.side_effect = error

        with self.assertRaisesRegex(
            RuntimeError,
            'The from address is not verified',
        ):
            send_email_with_attachment(
                to_email='recipient@example.com',
                subject='Diploma',
                body='Adjunto diploma.',
                filename='diploma.pdf',
                content=b'pdf-content',
                content_type='application/pdf',
            )


class PublicRegistrationNotificationFlowTests(APITestCase):
    def setUp(self):
        self.admin = Administrator.objects.create_user(email='admin@example.com')
        self.template = Course.objects.create(
            administrador=self.admin,
            titulo='Plantilla de capacitacion',
            activo=True,
        )
        self.name_field = self.template.form_fields.create(
            label='Nombre',
            tipo='short_text',
            campo_clave='nombre',
            orden=1,
        )
        self.email_field = self.template.form_fields.create(
            label='Correo',
            tipo='email',
            campo_clave='correo',
            orden=2,
        )
        self.course_field = self.template.form_fields.create(
            label='Curso',
            tipo='select',
            campo_clave='nombre_curso',
            orden=3,
        )
        self.phone_field = self.template.form_fields.create(
            label='Numero de Telefono',
            tipo='number',
            campo_clave='telefono',
            validacion={'exact_digits': 10, 'max_digits': 10},
            orden=4,
        )
        self.employee_field = self.template.form_fields.create(
            label='Numero de Empleado',
            tipo='number',
            campo_clave='numero_empleado',
            validacion={'exact_digits': 10, 'max_digits': 10},
            orden=5,
        )
        self.url = reverse(
            'public-inscription',
            kwargs={'qr_token': self.admin.qr_token},
        )
        self.payload = {
            'answers': [
                {'field_id': str(self.name_field.id), 'value': 'Ana Perez'},
                {'field_id': str(self.email_field.id), 'value': 'ana@gmail.com'},
                {
                    'field_id': str(self.course_field.id),
                    'value': 'Proteccion Civil',
                },
                {'field_id': str(self.phone_field.id), 'value': '7441234567'},
                {'field_id': str(self.employee_field.id), 'value': '0000123456'},
            ],
        }

    @patch('apps.courses.views.send_registration_confirmation')
    def test_sends_confirmation_after_registration(self, confirmation_mock):
        response = self.client.post(self.url, self.payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        registration = CourseRegistration.objects.get()
        self.assertEqual(
            registration.nombre_curso_snapshot,
            'Proteccion Civil',
        )
        confirmation_mock.assert_called_once_with(registration)

    @patch(
        'apps.courses.views.send_registration_confirmation',
        side_effect=RuntimeError('SendGrid unavailable'),
    )
    def test_email_failure_does_not_cancel_registration(self, _confirmation_mock):
        response = self.client.post(self.url, self.payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CourseRegistration.objects.count(), 1)

    @patch('apps.courses.views.send_registration_confirmation')
    def test_rejects_phone_or_employee_number_without_ten_digits(
        self,
        confirmation_mock,
    ):
        self.payload['answers'][-2]['value'] = '744123'

        response = self.client.post(self.url, self.payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('exactamente 10 digitos', str(response.data))
        self.assertEqual(CourseRegistration.objects.count(), 0)
        confirmation_mock.assert_not_called()

        self.payload['answers'][-2]['value'] = '7441234567'
        self.payload['answers'][-1]['value'] = '123'
        response = self.client.post(self.url, self.payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('exactamente 10 digitos', str(response.data))
        self.assertEqual(CourseRegistration.objects.count(), 0)
        confirmation_mock.assert_not_called()


class CourseArchiveFlowTests(APITestCase):
    def setUp(self):
        self.admin = Administrator.objects.create_user(email='admin@example.com')
        self.other_admin = Administrator.objects.create_user(email='other@example.com')
        self.client.force_authenticate(self.admin)
        self.template = Course.objects.create(
            administrador=self.admin,
            titulo='Plantilla principal',
        )
        self.registration = CourseRegistration.objects.create(
            administrador=self.admin,
            course=self.template,
            email_participante='persona@example.com',
            nombre_participante='Persona',
            nombre_curso_snapshot='Curso de prueba',
        )

    def test_deleting_template_archives_registrations_and_preserves_history(self):
        response = self.client.delete(
            reverse('course-detail', kwargs={'pk': self.template.pk})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Course.objects.filter(pk=self.template.pk).exists())

        self.registration.refresh_from_db()
        self.assertIsNone(self.registration.course)
        self.assertTrue(self.registration.curso_archivado)
        self.assertEqual(self.registration.administrador, self.admin)

        archived = self.client.get(reverse('archived-courses'))
        self.assertEqual(archived.status_code, status.HTTP_200_OK)
        self.assertEqual(archived.data[0]['nombre'], 'Curso de prueba')
        self.assertEqual(archived.data[0]['total'], 1)

    def test_active_template_cannot_be_deleted(self):
        self.template.activo = True
        self.template.save(update_fields=['activo'])

        response = self.client.delete(
            reverse('course-detail', kwargs={'pk': self.template.pk})
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('plantilla activa no se puede eliminar', response.data['detail'])
        self.assertTrue(Course.objects.filter(pk=self.template.pk).exists())

        self.registration.refresh_from_db()
        self.assertEqual(self.registration.course, self.template)
        self.assertFalse(self.registration.curso_archivado)

    def test_active_course_is_archived_instead_of_deleted(self):
        response = self.client.patch(
            reverse(
                'registrations-by-course',
                kwargs={'nombre_curso': 'Curso de prueba'},
            )
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.registration.refresh_from_db()
        self.assertTrue(self.registration.curso_archivado)

    def test_only_archived_course_can_be_deleted_permanently(self):
        active_delete = self.client.delete(
            reverse(
                'registrations-by-course',
                kwargs={'nombre_curso': 'Curso de prueba'},
            )
        )
        self.assertEqual(active_delete.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(CourseRegistration.objects.filter(pk=self.registration.pk).exists())

        self.registration.curso_archivado = True
        self.registration.save(update_fields=['curso_archivado'])
        archived_delete = self.client.delete(
            reverse(
                'archived-course-detail',
                kwargs={'nombre_curso': 'Curso de prueba'},
            )
        )
        self.assertEqual(archived_delete.status_code, status.HTTP_200_OK)
        self.assertFalse(CourseRegistration.objects.filter(pk=self.registration.pk).exists())

    def test_archived_history_is_isolated_by_administrator(self):
        other_template = Course.objects.create(
            administrador=self.other_admin,
            titulo='Otra plantilla',
        )
        CourseRegistration.objects.create(
            administrador=self.other_admin,
            course=other_template,
            email_participante='other@example.com',
            nombre_curso_snapshot='Curso ajeno',
            curso_archivado=True,
        )
        self.registration.curso_archivado = True
        self.registration.save(update_fields=['curso_archivado'])

        response = self.client.get(reverse('archived-courses'))
        names = [course['nombre'] for course in response.data]

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(names, ['Curso de prueba'])

    def test_archived_registration_is_read_only(self):
        self.registration.curso_archivado = True
        self.registration.save(update_fields=['curso_archivado'])

        response = self.client.patch(
            reverse('toggle-completado', kwargs={'pk': self.registration.pk})
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.registration.refresh_from_db()
        self.assertFalse(self.registration.completado)

    def test_template_seed_command_is_idempotent(self):
        self.admin.nombre = 'Gerardo Salinas'
        self.admin.save(update_fields=['nombre'])
        output = StringIO()
        call_command(
            'seed_training_templates',
            admin_name='Gerardo Salinas',
            stdout=output,
        )
        call_command(
            'seed_training_templates',
            admin_name='Gerardo Salinas',
            stdout=output,
        )

        templates = Course.objects.filter(
            administrador=self.admin,
            titulo__in=[
                'Gestion Administrativa',
                'Seguridad y Proteccion Civil',
                'Transformacion Digital',
                'Desarrollo Humano',
                'Etica y Servicio Publico',
            ],
        )
        registrations = CourseRegistration.objects.filter(
            administrador=self.admin,
            course__in=templates,
        )
        course_options = FieldOption.objects.filter(
            field__course__in=templates,
            field__campo_clave='nombre_curso',
        )

        self.assertEqual(templates.count(), 5)
        self.assertEqual(registrations.count(), 0)
        self.assertEqual(course_options.count(), 15)
        self.assertFalse(
            templates.filter(titulo__iregex=r'demo|prueba').exists()
        )
        self.assertFalse(
            course_options.filter(valor__iregex=r'demo|prueba').exists()
        )
        self.assertEqual(
            templates.first().form_fields.get(
                campo_clave='antiguedad',
            ).label,
            'Antigüedad Laboral (años)',
        )

    def test_legacy_seed_command_runs_institutional_template_loader(self):
        output = StringIO()

        call_command(
            'seed_demo_courses',
            admin_email=self.admin.email,
            stdout=output,
        )

        templates = Course.objects.filter(
            administrador=self.admin,
            titulo__in=[
                'Gestion Administrativa',
                'Seguridad y Proteccion Civil',
                'Transformacion Digital',
                'Desarrollo Humano',
                'Etica y Servicio Publico',
            ],
        )
        self.assertEqual(templates.count(), 5)
        self.assertFalse(
            templates.filter(titulo__iregex=r'demo|prueba').exists()
        )

    def test_production_template_migration_is_idempotent(self):
        production_admin = Administrator.objects.create_user(
            email='jsc.designx@gmail.com',
            nombre='Administrador',
        )

        create_institutional_templates(django_apps, None)
        create_institutional_templates(django_apps, None)

        templates = Course.objects.filter(administrador=production_admin)
        course_options = FieldOption.objects.filter(
            field__course__in=templates,
            field__campo_clave='nombre_curso',
        )

        self.assertEqual(templates.count(), 5)
        self.assertEqual(course_options.count(), 15)
        self.assertFalse(
            templates.filter(titulo__iregex=r'demo|prueba').exists()
        )
