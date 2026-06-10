"""Diplomas Views"""
import os
from django.utils import timezone
from django.core.mail import EmailMessage
from django.conf import settings
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from apps.courses.models import CourseRegistration
from .models import Diploma


ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


class DiplomaUploadView(APIView):
    """
    Upload a diploma file and send it via email to the participant.
    Only the registration's course admin can upload.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, registration_pk):
        # Fetch registration — enforce admin ownership
        try:
            registration = CourseRegistration.objects.select_related(
                'course__administrador', 'diploma'
            ).get(
                id=registration_pk,
                administrador=request.user,
                curso_archivado=False,
            )
        except CourseRegistration.DoesNotExist:
            return Response({'detail': 'Inscripción no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        if not registration.completado:
            return Response(
                {'detail': 'El participante debe marcarse como completado primero.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        file = request.FILES.get('archivo')
        if not file:
            return Response({'detail': 'No se recibió ningún archivo.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate extension
        ext = file.name.rsplit('.', 1)[-1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return Response(
                {'detail': f'Tipo no permitido. Usa: {", ".join(ALLOWED_EXTENSIONS)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate size
        if file.size > MAX_FILE_SIZE:
            return Response({'detail': 'El archivo supera los 10MB.'}, status=status.HTTP_400_BAD_REQUEST)

        # Save or overwrite diploma
        diploma, _ = Diploma.objects.get_or_create(registration=registration)
        diploma.archivo = file
        diploma.tipo_archivo = ext
        diploma.enviado = False
        diploma.error_envio = ''
        diploma.save()

        # Send email
        success, error = self._send_diploma_email(registration, diploma)

        if success:
            diploma.enviado = True
            diploma.fecha_envio = timezone.now()
            diploma.save()
            registration.diploma_enviado = True
            registration.save(update_fields=['diploma_enviado'])
            return Response({'detail': 'Diploma enviado exitosamente.'}, status=status.HTTP_200_OK)
        else:
            diploma.error_envio = str(error)
            diploma.save(update_fields=['error_envio'])
            return Response(
                {'detail': 'Diploma guardado pero falló el envío de correo.', 'error': str(error)},
                status=status.HTTP_207_MULTI_STATUS
            )

    def _send_diploma_email(self, registration, diploma):
        try:
            course = registration.course
            subject = f'Tu diploma — {course.titulo}'
            body = f"""
Estimado/a {registration.nombre_participante or registration.email_participante},

¡Felicitaciones! Has completado exitosamente el curso "{course.titulo}".

Adjunto encontrarás tu diploma de participación.

Atentamente,
{course.instructores or course.administrador.display_name}
            """.strip()

            email = EmailMessage(
                subject=subject,
                body=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[registration.email_participante],
            )
            diploma.archivo.open()
            email.attach(
                filename=f'diploma_{course.titulo}.{diploma.tipo_archivo}',
                content=diploma.archivo.read(),
                mimetype=self._get_mimetype(diploma.tipo_archivo),
            )
            diploma.archivo.close()
            email.send(fail_silently=False)
            return True, None
        except Exception as e:
            return False, e

    def _get_mimetype(self, ext):
        mimetypes = {
            'pdf': 'application/pdf',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
        }
        return mimetypes.get(ext, 'application/octet-stream')
