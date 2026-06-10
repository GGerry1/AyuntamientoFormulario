from io import StringIO
from unittest.mock import Mock, patch

from django.core.management import call_command
from django.test import SimpleTestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Administrator
from .models import Course, CourseRegistration, FieldOption
from .sendgrid_service import send_email_with_attachment


@override_settings(
    DEFAULT_FROM_EMAIL='verified@example.com',
    SENDGRID_API_KEY='test-api-key',
)
class SendGridServiceTests(SimpleTestCase):
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

    def test_demo_seed_command_is_idempotent(self):
        self.admin.nombre = 'Gerardo Salinas'
        self.admin.save(update_fields=['nombre'])
        output = StringIO()
        call_command(
            'seed_demo_courses',
            admin_name='Gerardo Salinas',
            stdout=output,
        )
        call_command(
            'seed_demo_courses',
            admin_name='Gerardo Salinas',
            stdout=output,
        )

        demo_templates = Course.objects.filter(
            administrador=self.admin,
            titulo__startswith='Plantilla Demo ',
        )
        demo_registrations = CourseRegistration.objects.filter(
            administrador=self.admin,
            course__in=demo_templates,
        )
        demo_course_options = FieldOption.objects.filter(
            field__course__in=demo_templates,
            field__campo_clave='nombre_curso',
        ).exclude(valor='Otro')

        self.assertEqual(demo_templates.count(), 3)
        self.assertEqual(demo_registrations.count(), 0)
        self.assertEqual(demo_course_options.count(), 9)
