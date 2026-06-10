from .sendgrid_service import send_email


def send_registration_confirmation(registration):
    participant_name = (
        registration.nombre_participante
        or registration.email_participante
    )
    course_name = registration.nombre_curso_snapshot or 'Curso'

    subject = f'Confirmación de inscripción - {course_name}'
    body = (
        f'Estimado/a {participant_name}:\n\n'
        'Por medio del presente, el H. Ayuntamiento de Acapulco de Juárez, '
        'a través de la Dirección de Capacitación y Desarrollo, confirma que '
        f'su inscripción al curso "{course_name}" ha sido registrada '
        'exitosamente.\n\n'
        'Agradecemos su interés en participar en nuestras actividades de '
        'formación. Le recomendamos conservar este mensaje como comprobante '
        'de su inscripción y mantenerse atento/a a cualquier información '
        'adicional relacionada con el curso.\n\n'
        'Atentamente,\n'
        'H. Ayuntamiento de Acapulco de Juárez\n'
        'Dirección de Capacitación y Desarrollo\n'
        '2024 - 2027'
    )

    return send_email(
        to_email=registration.email_participante,
        subject=subject,
        body=body,
    )
