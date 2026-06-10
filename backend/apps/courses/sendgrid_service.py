import base64

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


def send_email_with_attachment(
    *,
    to_email,
    subject,
    body,
    filename,
    content,
    content_type,
):
    message = Mail(
        from_email=settings.DEFAULT_FROM_EMAIL,
        to_emails=to_email,
        subject=subject,
        plain_text_content=body,
    )
    message.attachment = Attachment(
        FileContent(base64.b64encode(content).decode('ascii')),
        FileName(filename),
        FileType(content_type),
        Disposition('attachment'),
    )

    response = SendGridAPIClient(settings.SENDGRID_API_KEY).send(message)
    if not 200 <= response.status_code < 300:
        raise RuntimeError(
            f'SendGrid rechazo el correo con estado {response.status_code}.'
        )
    return response
