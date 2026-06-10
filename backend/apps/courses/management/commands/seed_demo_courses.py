from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import Administrator
from apps.courses.models import (
    Course,
    CourseRegistration,
    FieldOption,
    RegistrationAnswer,
)
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

PARTICIPANTS = [
    {
        'nombre': 'Participante Demo Uno',
        'sexo': 'Mujer',
        'puesto': 'Administrativo',
        'tipo_empleado': 'Confianza',
        'nivel_estudios': 'Licenciatura',
        'completado': True,
    },
    {
        'nombre': 'Participante Demo Dos',
        'sexo': 'Hombre',
        'puesto': 'Operativo',
        'tipo_empleado': 'Sindicalizado',
        'nivel_estudios': 'Preparatoria',
        'completado': False,
    },
]


class Command(BaseCommand):
    help = 'Crea 3 plantillas demo con 3 cursos y 2 inscritos ficticios por curso.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--admin-email',
            help='Correo del administrador propietario de los datos demo.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        admin = self._get_admin(options.get('admin_email'))
        created_templates = 0
        created_registrations = 0

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

            for course_index, course_name in enumerate(template_data['courses']):
                for participant_index, participant in enumerate(PARTICIPANTS):
                    email = (
                        f"demo.{template_data['titulo'].split()[-1].lower()}."
                        f"{course_index + 1}.{participant_index + 1}@example.com"
                    )
                    registration, registration_created = (
                        CourseRegistration.objects.get_or_create(
                            administrador=admin,
                            course=template,
                            email_participante=email,
                            nombre_curso_snapshot=course_name,
                            defaults={
                                'nombre_participante': participant['nombre'],
                                'completado': participant['completado'],
                                'fecha_completado': (
                                    timezone.now()
                                    if participant['completado']
                                    else None
                                ),
                            },
                        )
                    )
                    if registration_created:
                        self._create_answers(
                            registration,
                            template,
                            course_name,
                            participant,
                            email,
                            course_index,
                            participant_index,
                        )
                        created_registrations += 1

        self.stdout.write(self.style.SUCCESS(
            f'Datos demo listos para {admin.email}: '
            f'{created_templates} plantillas y '
            f'{created_registrations} inscripciones nuevas.'
        ))

    def _get_admin(self, email):
        admins = Administrator.objects.filter(activo=True).order_by('fecha_creacion')
        if email:
            try:
                return admins.get(email__iexact=email)
            except Administrator.DoesNotExist as exc:
                raise CommandError(
                    f'No existe un administrador activo con correo {email}.'
                ) from exc

        count = admins.count()
        if count == 1:
            return admins.first()
        if count == 0:
            raise CommandError('No existe ningun administrador activo.')
        raise CommandError(
            'Hay varios administradores. Ejecuta el comando con --admin-email.'
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

    def _create_answers(
        self,
        registration,
        template,
        course_name,
        participant,
        email,
        course_index,
        participant_index,
    ):
        values = {
            'nombre_curso': course_name,
            'nombre': participant['nombre'],
            'correo': email,
            'sexo': participant['sexo'],
            'edad': str(28 + course_index + participant_index),
            'telefono': f'744000{course_index + 1:02d}{participant_index + 1:02d}',
            'numero_empleado': f'90{course_index + 1:02d}{participant_index + 1:02d}',
            'puesto': participant['puesto'],
            'tipo_empleado': participant['tipo_empleado'],
            'nivel_estudios': participant['nivel_estudios'],
            'antiguedad': str(3 + course_index + participant_index),
        }
        fields = {
            field.campo_clave: field
            for field in template.form_fields.exclude(campo_clave='')
        }
        for key, value in values.items():
            field = fields.get(key)
            RegistrationAnswer.objects.create(
                registration=registration,
                field=field,
                campo_label_snapshot=field.label if field else key,
                campo_clave_snapshot=key,
                valor_texto=value,
            )
