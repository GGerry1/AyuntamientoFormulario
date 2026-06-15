from io import BytesIO
from pathlib import Path

from PIL import Image, UnidentifiedImageError


MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_TYPES = {
    'pdf': 'application/pdf',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
}


class InvalidUpload(ValueError):
    pass


def validate_diploma_upload(uploaded_file):
    filename = Path(uploaded_file.name).name
    extension = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    expected_mime = ALLOWED_TYPES.get(extension)

    if not expected_mime:
        raise InvalidUpload('Formato no permitido. Usa PDF, JPG o PNG.')
    if uploaded_file.size > MAX_FILE_SIZE:
        raise InvalidUpload('El archivo supera los 10 MB.')
    if uploaded_file.content_type != expected_mime:
        raise InvalidUpload('El tipo MIME del archivo no coincide con su extensión.')

    content = uploaded_file.read()
    uploaded_file.seek(0)
    if not content:
        raise InvalidUpload('El archivo está vacío.')

    if extension == 'pdf':
        if not content.startswith(b'%PDF-') or b'%%EOF' not in content[-2048:]:
            raise InvalidUpload('El archivo no contiene un PDF válido.')
    else:
        try:
            with Image.open(BytesIO(content)) as image:
                image.verify()
                actual_format = image.format
        except (UnidentifiedImageError, OSError, ValueError):
            raise InvalidUpload('El archivo no contiene una imagen válida.')

        allowed_formats = {'png': 'PNG', 'jpg': 'JPEG', 'jpeg': 'JPEG'}
        if actual_format != allowed_formats[extension]:
            raise InvalidUpload('El contenido de la imagen no coincide con su extensión.')

    return {
        'extension': extension,
        'content_type': expected_mime,
        'filename': filename,
        'content': content,
    }
