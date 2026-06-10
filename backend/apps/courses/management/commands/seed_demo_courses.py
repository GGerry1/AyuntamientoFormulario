from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import Administrator
from apps.courses.models import Course, FieldOption
from apps.courses.views import create_default_fields


DEMO_TEMPLATES = [
    {
        'titulo': 'Plantilla Demo Administrativa',
        'descripcion': 'Formulario de prueba para capacitacion administrativa.',
        'instructores': 'Equipo de Capacitacion',
        'courses': [
            'Atencion Ciudadana',
            'Excel Basico',
            'Archivo y Transparencia',
        ],
    },
    {
        'titulo': 'Plantilla Demo Operativa',
        'descripcion': 'Formulario de prueba para capacitacion operativa.',
        'instructores': 'Equipo de Proteccion Civil',
        'courses': [
            'Proteccion Civil',
            'Primeros Auxilios',
            'Seguridad Laboral',
        ],
    },
    {
        'titulo': 'Plantilla Demo Digital',
        'descripcion': 'Formulario de prueba para habilidades digitales.',
        'instructores': 'Equipo de Innovacion',
        'courses': [
            'Ciberseguridad',
            'Herramientas Google',
            'Gestion de Datos',
        ],
    },
]

class Command(BaseCommand):
    help = 'Crea 3 plantillas demo con 3 opciones de curso en cada una.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--admin-email',
            help='Correo del administrador propietario de los datos demo.',
        )
        parser.add_argument(
            '--admin-name',
            help='Nombre del administrador propietario de los datos demo.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        admin = self._get_admin(
            email=options.get('admin_email'),
            name=options.get('admin_name'),
        )
        created_templates = 0

        for template_data in DEMO_TEMPLATES:
            template, created = Course.objects.get_or_create(
                administrador=admin,
                titulo=template_data['titulo'],
                defaults={
                    'descripcion': template_data['descripcion'],
                    'instructores': template_data['instructores'],
                    'activo': False,
                },
            )
            if created:
                create_default_fields(template)
                created_templates += 1

            self._add_course_options(template, template_data['courses'])

        self.stdout.write(self.style.SUCCESS(
            f'Datos demo listos para {admin.email}: '
            f'{created_templates} plantillas nuevas, sin inscripciones.'
        ))

    def _get_admin(self, email=None, name=None):
        admins = Administrator.objects.filter(activo=True).order_by('fecha_creacion')
        if email:
            try:
                return admins.get(email__iexact=email)
            except Administrator.DoesNotExist as exc:
                raise CommandError(
                    f'No existe un administrador activo con correo {email}.'
                ) from exc
        if name:
            matches = admins.filter(nombre__iexact=name)
            if matches.count() == 1:
                return matches.first()
            if not matches.exists():
                raise CommandError(
                    f'No existe un administrador activo con nombre {name}.'
                )
            raise CommandError(
                f'Hay varios administradores activos con nombre {name}. '
                'Usa --admin-email.'
            )

        count = admins.count()
        if count == 1:
            return admins.first()
        if count == 0:
            raise CommandError('No existe ningun administrador activo.')
        raise CommandError(
            'Hay varios administradores. Usa --admin-email o --admin-name.'
        )

    def _add_course_options(self, template, course_names):
        field = template.form_fields.filter(campo_clave='nombre_curso').first()
        if not field:
            return
        for index, course_name in enumerate(course_names):
            FieldOption.objects.get_or_create(
                field=field,
                valor=course_name,
                defaults={'etiqueta': course_name, 'orden': index},
            )
