import base64
import json

from django.conf import settings
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import (
    Attachment,
    Disposition,
    FileContent,
    FileName,
    FileType,
    Mail,
)


def _sendgrid_error_message(exc):
    body = getattr(exc, 'body', None)
    if isinstance(body, bytes):
        body = body.decode('utf-8', errors='replace')

    if body:
        try:
            errors = json.loads(body).get('errors', [])
            if errors and errors[0].get('message'):
                return errors[0]['message']
        except (TypeError, ValueError, AttributeError):
            pass

    return str(exc) or 'SendGrid rechazo la solicitud.'


def send_email_with_attachment(
    *,
    to_email,
    subject,
    body,
    filename,
    content,
    content_type,
):
    message = _build_message(to_email, subject, body)
    message.attachment = Attachment(
        FileContent(base64.b64encode(content).decode('ascii')),
        FileName(filename),
        FileType(content_type),
        Disposition('attachment'),
    )
    return _send_message(message)


def send_email(*, to_email, subject, body):
    return _send_message(_build_message(to_email, subject, body))


def _build_message(to_email, subject, body):
    return Mail(
        from_email=settings.DEFAULT_FROM_EMAIL,
        to_emails=to_email,
        subject=subject,
        plain_text_content=body,
    )


def _send_message(message):
    try:
        response = SendGridAPIClient(settings.SENDGRID_API_KEY).send(message)
    except Exception as exc:
        raise RuntimeError(
            f'Error de SendGrid: {_sendgrid_error_message(exc)}'
        ) from exc

    if not 200 <= response.status_code < 300:
        raise RuntimeError(
            f'SendGrid rechazo el correo con estado {response.status_code}.'
        )
    return response
