"""Diplomas Views"""
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from apps.courses.models import CourseRegistration
from apps.courses.file_validation import InvalidUpload, validate_diploma_upload
from apps.courses.sendgrid_service import send_email_with_attachment
from .models import Diploma


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

        try:
            validated_file = validate_diploma_upload(file)
        except InvalidUpload as exc:
            return Response(
                {'detail': str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Save or overwrite diploma
        diploma, _ = Diploma.objects.get_or_create(registration=registration)
        diploma.archivo = file
        diploma.tipo_archivo = validated_file['extension']
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

            diploma.archivo.open()
            try:
                content = diploma.archivo.read()
            finally:
                diploma.archivo.close()

            send_email_with_attachment(
                to_email=registration.email_participante,
                subject=subject,
                body=body,
                filename=f'diploma_{course.titulo}.{diploma.tipo_archivo}',
                content=content,
                content_type=self._get_mimetype(diploma.tipo_archivo),
            )
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
