"""
Courses Views - Updated
- Max 10 plantillas per admin
- Only one active at a time
- Default base fields on create
- Activate/deactivate endpoint
- Statistics by curso name
"""
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, permissions, status, generics, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Course, CourseFormField, FieldOption, CourseRegistration
from .serializers import (
    CourseSerializer, CourseWriteSerializer, CourseActivateSerializer,
    CourseFormFieldSerializer, CourseFormFieldWriteSerializer,
    PublicFormSerializer, RegistrationSubmitSerializer,
    RegistrationSerializer, RegistrationListSerializer,
    MarkCompletedSerializer,
)

MAX_PLANTILLAS = 10

# ─────────────────────────────────────────────
# DEFAULT BASE FIELDS DEFINITION
# ─────────────────────────────────────────────

DEFAULT_FIELDS = [
    {
        'label': 'Nombre del Curso',
        'tipo': 'select',
        'obligatorio': True,
        'orden': 1,
        'es_campo_base': True,
        'campo_clave': 'nombre_curso',
        'validacion': None,
        'options': [
            {'valor': 'Otro', 'etiqueta': 'Otro', 'orden': 99},
        ],
    },
    {
        'label': 'En caso de seleccionar "Otro", especifique el nombre del curso',
        'tipo': 'long_text',
        'obligatorio': False,
        'orden': 2,
        'es_campo_base': True,
        'campo_clave': 'nombre_curso_otro',
        'validacion': None,
        'options': [],
    },
    {
        'label': 'Nombre',
        'tipo': 'short_text',
        'obligatorio': True,
        'orden': 3,
        'es_campo_base': True,
        'campo_clave': 'nombre',
        'validacion': None,
        'options': [],
    },
    {
        'label': 'Correo Electronico',
        'tipo': 'email',
        'obligatorio': True,
        'orden': 4,
        'es_campo_base': True,
        'campo_clave': 'correo',
        'validacion': None,
        'options': [],
    },
    {
        'label': 'Sexo',
        'tipo': 'select',
        'obligatorio': True,
        'orden': 5,
        'es_campo_base': True,
        'campo_clave': 'sexo',
        'validacion': None,
        'options': [
            {'valor': 'Hombre', 'etiqueta': 'Hombre', 'orden': 0},
            {'valor': 'Mujer', 'etiqueta': 'Mujer', 'orden': 1},
        ],
    },
    {
        'label': 'Edad',
        'tipo': 'number',
        'obligatorio': True,
        'orden': 6,
        'es_campo_base': True,
        'campo_clave': 'edad',
        'validacion': {'max_digits': 2},
        'options': [],
    },
    {
        'label': 'Numero de Telefono',
        'tipo': 'number',
        'obligatorio': True,
        'orden': 7,
        'es_campo_base': True,
        'campo_clave': 'telefono',
        'validacion': {'max_digits': 10},
        'options': [],
    },
    {
        'label': 'Numero de Empleado',
        'tipo': 'number',
        'obligatorio': True,
        'orden': 8,
        'es_campo_base': True,
        'campo_clave': 'numero_empleado',
        'validacion': None,
        'options': [],
    },
    {
        'label': 'Puesto Actual',
        'tipo': 'radio',
        'obligatorio': True,
        'orden': 9,
        'es_campo_base': True,
        'campo_clave': 'puesto',
        'validacion': None,
        'options': [
            {'valor': 'Administrativo', 'etiqueta': 'Administrativo', 'orden': 0},
            {'valor': 'Operativo', 'etiqueta': 'Operativo', 'orden': 1},
            {'valor': 'Funcionario', 'etiqueta': 'Funcionario', 'orden': 2},
        ],
    },
    {
        'label': 'Tipo de Empleado',
        'tipo': 'select',
        'obligatorio': True,
        'orden': 10,
        'es_campo_base': True,
        'campo_clave': 'tipo_empleado',
        'validacion': None,
        'options': [
            {'valor': 'Sindicalizado', 'etiqueta': 'Sindicalizado', 'orden': 0},
            {'valor': 'Supernumerario', 'etiqueta': 'Supernumerario', 'orden': 1},
            {'valor': 'Eventual', 'etiqueta': 'Eventual', 'orden': 2},
            {'valor': 'Confianza', 'etiqueta': 'Confianza', 'orden': 3},
        ],
    },
    {
        'label': 'Nivel de Estudios',
        'tipo': 'select',
        'obligatorio': True,
        'orden': 11,
        'es_campo_base': True,
        'campo_clave': 'nivel_estudios',
        'validacion': None,
        'options': [
            {'valor': 'Primaria', 'etiqueta': 'Primaria', 'orden': 0},
            {'valor': 'Secundaria', 'etiqueta': 'Secundaria', 'orden': 1},
            {'valor': 'Preparatoria', 'etiqueta': 'Preparatoria', 'orden': 2},
            {'valor': 'Licenciatura', 'etiqueta': 'Licenciatura', 'orden': 3},
            {'valor': 'Ingenieria', 'etiqueta': 'Ingenieria', 'orden': 4},
            {'valor': 'Maestria', 'etiqueta': 'Maestria', 'orden': 5},
            {'valor': 'Doctorado', 'etiqueta': 'Doctorado', 'orden': 6},
        ],
    },
    {
        'label': 'Antiguedad Laboral (anos)',
        'tipo': 'number',
        'obligatorio': True,
        'orden': 12,
        'es_campo_base': True,
        'campo_clave': 'antiguedad',
        'validacion': {'max_digits': 2},
        'options': [],
    },
]


def create_default_fields(course):
    """Create all default base fields for a new course."""
    import copy
    for field_data in DEFAULT_FIELDS:
        data = copy.deepcopy(field_data)
        options = data.pop('options', [])
        field = CourseFormField.objects.create(course=course, **data)
        for opt in options:
            FieldOption.objects.create(field=field, **opt)


# ─────────────────────────────────────────────
# PUBLIC VIEW
# ─────────────────────────────────────────────

class PublicInscriptionView(APIView):
    permission_classes = [permissions.AllowAny]

    def _get_active_course(self, qr_token):
        from apps.accounts.models import Administrator
        admin = get_object_or_404(Administrator, qr_token=qr_token, activo=True)
        course = Course.objects.filter(administrador=admin, activo=True).first()
        return course

    def get(self, request, qr_token):
        course = self._get_active_course(qr_token)
        if not course:
            return Response(
                {'detail': 'No hay ningun curso activo en este momento.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = PublicFormSerializer(course)
        return Response(serializer.data)

    def post(self, request, qr_token):
        course = self._get_active_course(qr_token)
        if not course:
            return Response(
                {'detail': 'No hay ningun curso activo.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = RegistrationSubmitSerializer(
            data=request.data,
            context={'course': course, 'request': request}
        )
        if serializer.is_valid():
            registration = serializer.create_registration(course, request)
            return Response(
                {'detail': 'Inscripcion exitosa!', 'id': str(registration.id)},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────
# ADMIN — COURSES (PLANTILLAS)
# ─────────────────────────────────────────────

class CourseViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Course.objects.filter(administrador=self.request.user)

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return CourseWriteSerializer
        return CourseSerializer

    def create(self, request, *args, **kwargs):
        # Enforce max 10 plantillas
        count = Course.objects.filter(administrador=request.user).count()
        if count >= MAX_PLANTILLAS:
            return Response(
                {'detail': f'Has alcanzado el limite de {MAX_PLANTILLAS} plantillas.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        course = serializer.save(administrador=request.user)
        # Create default base fields
        create_default_fields(course)
        return Response(CourseSerializer(course).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        course = self.get_object()
        # Preserve registrations: SET_NULL handled by model
        # If this was the active course, just delete it
        course.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['patch'])
    def toggle_active(self, request, pk=None):
        """Activate or deactivate a plantilla."""
        course = self.get_object()
        serializer = CourseActivateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        activate = serializer.validated_data['activo']
        if activate:
            course.activate()
        else:
            course.deactivate()
        return Response(CourseSerializer(course).data)

    @action(detail=True, methods=['get'])
    def registrations(self, request, pk=None):
        course = self.get_object()
        qs = course.registrations.all()
        # Filter by curso name if provided
        nombre_curso = request.query_params.get('nombre_curso')
        if nombre_curso:
            qs = qs.filter(nombre_curso_snapshot=nombre_curso)
        serializer = RegistrationListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        course = self.get_object()
        nombre_curso = request.query_params.get('nombre_curso')
        qs = course.registrations.all()
        if nombre_curso:
            qs = qs.filter(nombre_curso_snapshot=nombre_curso)
        return Response(_build_statistics(course, qs))

    @action(detail=True, methods=['get'])
    def course_names(self, request, pk=None):
        """Return distinct course names registered in this plantilla."""
        course = self.get_object()
        names = (course.registrations
                 .values_list('nombre_curso_snapshot', flat=True)
                 .distinct()
                 .exclude(nombre_curso_snapshot=''))
        return Response(list(names))


# ─────────────────────────────────────────────
# ADMIN — FORM FIELDS
# ─────────────────────────────────────────────

class CourseFormFieldViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CourseFormField.objects.filter(
            course__administrador=self.request.user,
            course_id=self.kwargs.get('course_pk')
        )

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return CourseFormFieldWriteSerializer
        return CourseFormFieldSerializer

    def perform_create(self, serializer):
        course = get_object_or_404(
            Course, id=self.kwargs.get('course_pk'),
            administrador=self.request.user
        )
        serializer.save(course=course)

    def destroy(self, request, *args, **kwargs):
        field = self.get_object()
        if field.es_campo_base:
            return Response(
                {'detail': 'Los campos base no se pueden eliminar.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        field.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────────────────
# ADMIN — REGISTRATIONS
# ─────────────────────────────────────────────

class RegistrationDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RegistrationSerializer

    def get_queryset(self):
        return CourseRegistration.objects.filter(
            course__administrador=self.request.user
        ).prefetch_related('answers__field')

    def patch(self, request, *args, **kwargs):
        registration = self.get_object()
        serializer = MarkCompletedSerializer(data=request.data)
        if serializer.is_valid():
            registration.completado = serializer.validated_data['completado']
            if registration.completado and not registration.fecha_completado:
                registration.fecha_completado = timezone.now()
            registration.save()
            return Response(RegistrationSerializer(registration).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────
# ADMIN — GLOBAL STATISTICS
# ─────────────────────────────────────────────

class AdminStatisticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # All registrations for this admin
        qs = CourseRegistration.objects.filter(
            course__administrador=request.user
        ).prefetch_related('answers__field')

        stats = _build_admin_statistics(qs)

        # Build course list from RegistrationAnswer campo_clave='nombre_curso'
        # Group by value and count
        from collections import defaultdict
        course_counts = defaultdict(int)
        for reg in qs:
            for answer in reg.answers.all():
                if answer.campo_clave_snapshot == 'nombre_curso' and answer.valor_texto:
                    nombre = answer.valor_texto.strip()
                    if nombre and nombre.lower() != 'otro':
                        course_counts[nombre] += 1

        stats['cursos_lista'] = [
            {'nombre': nombre, 'total': count}
            for nombre, count in sorted(course_counts.items(), key=lambda x: -x[1])
        ]
        return Response(stats)


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def _build_statistics(course, registrations):
    data = {
        'total': registrations.count(),
        'completaron': registrations.filter(completado=True).count(),
        'pendientes': registrations.filter(completado=False).count(),
        'campos': [],
    }
    for field in course.form_fields.filter(activo=True):
        if field.tipo in ('select', 'radio', 'checkbox'):
            distribution = {}
            for reg in registrations:
                for answer in reg.answers.filter(field=field):
                    values = answer.valor_multiple or [answer.valor_texto]
                    for v in values:
                        if v:
                            distribution[v] = distribution.get(v, 0) + 1
            data['campos'].append({
                'label': field.label,
                'tipo': field.tipo,
                'campo_clave': field.campo_clave,
                'distribucion': distribution,
            })
    return data


def _build_admin_statistics(registrations):
    from collections import defaultdict
    charts = {
        'sexo': defaultdict(int),
        'nivel_estudios': defaultdict(int),
        'tipo_empleado': defaultdict(int),
        'puesto': defaultdict(int),
        'antiguedad': defaultdict(int),
        'inscripciones_por_mes': defaultdict(int),
    }

    for reg in registrations:
        month_key = reg.fecha_inscripcion.strftime('%Y-%m')
        charts['inscripciones_por_mes'][month_key] += 1

        for answer in reg.answers.all():
            clave = answer.campo_clave_snapshot
            value = answer.valor_texto or ''
            if not value or not clave:
                continue
            if clave in charts:
                charts[clave][value] += 1

    return {k: dict(v) for k, v in charts.items()}


# ─────────────────────────────────────────────
# PUBLIC REPORT (shareable, no auth)
# ─────────────────────────────────────────────

class PublicCourseReportView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, course_id):
        course = Course.objects.filter(id=course_id).first()
        if not course:
            return Response({'detail': 'Reporte no disponible.'}, status=status.HTTP_404_NOT_FOUND)
        registrations = course.registrations.all()
        stats = _build_statistics(course, registrations)
        return Response({
            'titulo': course.titulo,
            'stats': stats,
        })


class CourseNameStatsView(APIView):
    """Stats for a specific curso name (from nombre_curso field)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, nombre_curso):
        from collections import defaultdict
        # Find all registrations where nombre_curso answer matches
        admin_courses = Course.objects.filter(administrador=request.user)
        registrations = CourseRegistration.objects.filter(
            course__in=admin_courses
        ).prefetch_related('answers__field')

        # Filter by nombre_curso answer value
        matching_ids = []
        for reg in registrations:
            for answer in reg.answers.all():
                if answer.campo_clave_snapshot == 'nombre_curso' and answer.valor_texto.strip() == nombre_curso:
                    matching_ids.append(reg.id)
                    break

        qs = registrations.filter(id__in=matching_ids)
        total = qs.count()
        completaron = qs.filter(completado=True).count()

        # Build field distributions
        field_stats = defaultdict(lambda: defaultdict(int))
        field_labels = {}

        EXCLUIR = {'nombre', 'correo', 'telefono', 'numero_empleado', 'nombre_curso', 'nombre_curso_otro'}

        for reg in qs:
            for answer in reg.answers.all():
                clave = answer.campo_clave_snapshot
                label = answer.campo_label_snapshot
                if not clave or clave in EXCLUIR:
                    continue
                field_labels[clave] = label
                values = answer.valor_multiple or [answer.valor_texto]
                for v in values:
                    if v:
                        field_stats[clave][v] += 1

        campos = [
            {
                'campo_clave': clave,
                'label': field_labels.get(clave, clave),
                'distribucion': dict(dist),
            }
            for clave, dist in field_stats.items()
        ]

        return Response({
            'nombre_curso': nombre_curso,
            'total': total,
            'completaron': completaron,
            'pendientes': total - completaron,
            'campos': campos,
        })


class PublicCourseNameReportView(APIView):
    """Public shareable report by course name token."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, nombre_curso):
        from collections import defaultdict
        nombre = nombre_curso.replace('-', ' ')

        registrations = CourseRegistration.objects.filter(
            course__isnull=False
        ).prefetch_related('answers__field')

        matching_ids = []
        for reg in registrations:
            for answer in reg.answers.all():
                if answer.campo_clave_snapshot == 'nombre_curso' and answer.valor_texto.strip().lower() == nombre.lower():
                    matching_ids.append(reg.id)
                    break

        qs = registrations.filter(id__in=matching_ids)
        if not qs.exists():
            return Response({'detail': 'Reporte no disponible.'}, status=404)

        total = qs.count()
        completaron = qs.filter(completado=True).count()

        field_stats = defaultdict(lambda: defaultdict(int))
        field_labels = {}

        EXCLUIR = {'nombre', 'correo', 'telefono', 'numero_empleado', 'nombre_curso', 'nombre_curso_otro'}

        for reg in qs:
            for answer in reg.answers.all():
                clave = answer.campo_clave_snapshot
                label = answer.campo_label_snapshot
                if not clave or clave in EXCLUIR:
                    continue
                field_labels[clave] = label
                values = answer.valor_multiple or [answer.valor_texto]
                for v in values:
                    if v:
                        field_stats[clave][v] += 1

        campos = [
            {'campo_clave': clave, 'label': field_labels.get(clave, clave), 'distribucion': dict(dist)}
            for clave, dist in field_stats.items()
        ]

        return Response({
            'nombre_curso': nombre,
            'total': total,
            'completaron': completaron,
            'pendientes': total - completaron,
            'campos': campos,
        })


# ─────────────────────────────────────────────
# REGISTRATIONS BY COURSE NAME
# ─────────────────────────────────────────────

class RegistrationsByCourseNameView(APIView):
    """List all registrations for a given nombre_curso value."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, nombre_curso):
        nombre = nombre_curso.strip()
        admin_courses = Course.objects.filter(administrador=request.user)
        registrations = CourseRegistration.objects.filter(
            course__in=admin_courses
        ).prefetch_related('answers')

        matching = []
        for reg in registrations:
            for answer in reg.answers.all():
                if answer.campo_clave_snapshot == 'nombre_curso' and answer.valor_texto.strip() == nombre:
                    matching.append(reg)
                    break

        result = []
        for reg in matching:
            answers = {a.campo_clave_snapshot: a.valor_texto for a in reg.answers.all()}
            result.append({
                'id': str(reg.id),
                'nombre': answers.get('nombre', ''),
                'correo': answers.get('correo', reg.email_participante),
                'telefono': answers.get('telefono', ''),
                'numero_empleado': answers.get('numero_empleado', ''),
                'completado': reg.completado,
                'diploma_enviado': reg.diploma_enviado,
                'fecha_inscripcion': reg.fecha_inscripcion,
            })

        return Response(result)

    def delete(self, request, nombre_curso):
        """Delete ALL registrations for a course name — permanent."""
        nombre = nombre_curso.strip()
        admin_courses = Course.objects.filter(administrador=request.user)
        registrations = CourseRegistration.objects.filter(course__in=admin_courses).prefetch_related('answers')

        to_delete = []
        for reg in registrations:
            for answer in reg.answers.all():
                if answer.campo_clave_snapshot == 'nombre_curso' and answer.valor_texto.strip() == nombre:
                    to_delete.append(reg.id)
                    break

        deleted_count, _ = CourseRegistration.objects.filter(id__in=to_delete).delete()
        return Response({'deleted': deleted_count})


# ─────────────────────────────────────────────
# TOGGLE COMPLETADO
# ─────────────────────────────────────────────

class ToggleCompletadoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            reg = CourseRegistration.objects.get(
                id=pk,
                course__administrador=request.user
            )
        except CourseRegistration.DoesNotExist:
            return Response({'detail': 'No encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        reg.completado = not reg.completado
        if reg.completado:
            from django.utils import timezone
            reg.fecha_completado = timezone.now()
        else:
            reg.fecha_completado = None
        reg.save(update_fields=['completado', 'fecha_completado'])
        return Response({'completado': reg.completado})


# ─────────────────────────────────────────────
# SEND DIPLOMA
# ─────────────────────────────────────────────

class SendDiplomaView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def post(self, request, pk):
        try:
            reg = CourseRegistration.objects.get(
                id=pk,
                course__administrador=request.user
            )
        except CourseRegistration.DoesNotExist:
            return Response({'detail': 'No encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if not reg.completado:
            return Response(
                {'detail': 'Solo se puede enviar diploma a participantes con curso completado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        archivo = request.FILES.get('diploma')
        if not archivo:
            return Response({'detail': 'No se recibio archivo.'}, status=status.HTTP_400_BAD_REQUEST)

        ext = archivo.name.split('.')[-1].lower()
        if ext not in ['pdf', 'jpg', 'jpeg', 'png']:
            return Response(
                {'detail': 'Formato no permitido. Usa PDF, JPG o PNG.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get participant name
        nombre_part = reg.nombre_participante or reg.email_participante
        answers_qs = reg.answers.filter(campo_clave_snapshot='nombre')
        if answers_qs.exists():
            nombre_part = answers_qs.first().valor_texto or nombre_part

        # Get course name
        curso_nombre = reg.nombre_curso_snapshot or 'Curso'
        answers_curso = reg.answers.filter(campo_clave_snapshot='nombre_curso')
        if answers_curso.exists():
            curso_nombre = answers_curso.first().valor_texto or curso_nombre

        # Build email
        from django.core.mail import EmailMessage
        from django.conf import settings

        subject = f'Constancia de participacion — {curso_nombre}'
        body = (
            f'Estimado/a {nombre_part},\n\n'
            f'Nos complace enviarle su constancia de participacion en el curso: {curso_nombre}.\n\n'
            f'H. Ayuntamiento de Acapulco de Juarez\n'
            f'Direccion de Capacitacion y Desarrollo\n'
            f'2024 - 2027'
        )

        email = EmailMessage(
            subject=subject,
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[reg.email_participante],
        )

        content_types = {
            'pdf':  'application/pdf',
            'jpg':  'image/jpeg',
            'jpeg': 'image/jpeg',
            'png':  'image/png',
        }
        email.attach(archivo.name, archivo.read(), content_types.get(ext, 'application/octet-stream'))

        try:
            email.send(fail_silently=False)
        except Exception as e:
            return Response(
                {'detail': f'Error al enviar correo: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        from django.utils import timezone
        reg.diploma_enviado = True
        reg.fecha_diploma = timezone.now()
        reg.save(update_fields=['diploma_enviado', 'fecha_diploma'])

        return Response({
            'ok': True,
            'mensaje': f'Diploma enviado a {reg.email_participante}',
            'diploma_enviado': True,
        })
