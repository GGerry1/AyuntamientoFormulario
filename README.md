# CursoGov — Sistema de Inscripción de Cursos

Sistema web multi-tenant para gestión de cursos, inscripciones y diplomas para instituciones públicas.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│  Internet / QR scan                                     │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTPS
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Nginx (proxy inverso + SSL + rate limiting)            │
└──────────┬──────────────────────┬───────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────┐   ┌──────────────────────────────────┐
│  React SPA       │   │  Gunicorn / Django + DRF          │
│  (static build)  │   │  - allauth OAuth                 │
└──────────────────┘   │  - JWT (simplejwt)               │
                       │  - Rate limiting                  │
                       └──────────────┬───────────────────┘
                                      │
                            ┌─────────┴──────────┐
                            ▼                    ▼
                    ┌──────────────┐   ┌──────────────────┐
                    │ PostgreSQL   │   │ Redis (Celery)    │
                    └──────────────┘   └──────────────────┘
```

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite |
| Backend | Django 4.2 + Django REST Framework |
| Auth | django-allauth (Google + Microsoft OAuth2) |
| Tokens | JWT via djangorestframework-simplejwt |
| DB | PostgreSQL |
| Queue | Celery + Redis |
| Email | SendGrid |
| Servidor | Nginx + Gunicorn |

---

## Modelos de datos

```
Administrator (custom user)
  ├── id (UUID)
  ├── email (único)
  ├── nombre
  ├── proveedor_oauth (google / microsoft)
  ├── qr_token (UUID único, no editable)
  ├── fecha_creacion
  └── activo

Course
  ├── id (UUID)
  ├── administrador → Administrator
  ├── titulo
  ├── descripcion
  ├── instructores
  ├── fecha_inicio / fecha_fin
  └── activo

CourseFormField
  ├── id (UUID)
  ├── course → Course
  ├── label
  ├── tipo (short_text | long_text | email | number |
  │         select | radio | checkbox | date | time | datetime)
  ├── obligatorio
  ├── orden
  └── activo

FieldOption
  ├── field → CourseFormField
  ├── valor
  ├── etiqueta
  └── orden

CourseRegistration
  ├── id (UUID)
  ├── course → Course
  ├── email_participante
  ├── nombre_participante
  ├── ip_address
  ├── fecha_inscripcion
  ├── completado
  └── diploma_enviado

RegistrationAnswer
  ├── registration → CourseRegistration
  ├── field → CourseFormField
  ├── valor_texto
  └── valor_multiple (JSON, para checkbox)

Diploma
  ├── registration → CourseRegistration (OneToOne)
  ├── archivo
  ├── tipo_archivo
  ├── enviado
  └── fecha_envio
```

---

## API Endpoints

### Públicos (sin autenticación)

```
GET  /api/v1/courses/inscripcion/{qr_token}/
     → Formulario del curso

POST /api/v1/courses/inscripcion/{qr_token}/
     Body: { answers: [{field_id, value}] }
     → Inscripción del participante
```

### Autenticados (Admin JWT)

```
GET/PATCH  /api/v1/auth/me/
GET        /api/v1/auth/dashboard/stats/
POST       /api/v1/auth/logout/

GET/POST   /api/v1/courses/
GET/PATCH  /api/v1/courses/{id}/
GET        /api/v1/courses/{id}/registrations/
GET        /api/v1/courses/{id}/statistics/

GET/POST   /api/v1/courses/{course_id}/form-fields/
GET/PATCH  /api/v1/courses/{course_id}/form-fields/{id}/

PATCH      /api/v1/courses/registrations/{id}/   → mark completed
POST       /api/v1/diplomas/{registration_id}/upload/
```

### Ejemplo JSON — formulario público

```json
GET /api/v1/courses/inscripcion/550e8400-e29b-41d4-a716-446655440000/

{
  "id": "...",
  "titulo": "Curso de Inducción 2025",
  "descripcion": "Bienvenida a nuevos empleados",
  "instructores": "Lic. García, Ing. López",
  "fields": [
    {
      "id": "...",
      "label": "Nombre completo",
      "tipo": "short_text",
      "obligatorio": true,
      "orden": 1,
      "options": []
    },
    {
      "id": "...",
      "label": "Correo electrónico",
      "tipo": "email",
      "obligatorio": true,
      "orden": 2,
      "options": []
    },
    {
      "id": "...",
      "label": "Sexo",
      "tipo": "radio",
      "obligatorio": true,
      "orden": 3,
      "options": [
        {"id": "...", "valor": "masculino", "etiqueta": "Masculino"},
        {"id": "...", "valor": "femenino", "etiqueta": "Femenino"},
        {"id": "...", "valor": "otro", "etiqueta": "Prefiero no decir"}
      ]
    },
    {
      "id": "...",
      "label": "Nivel de estudios",
      "tipo": "select",
      "obligatorio": false,
      "orden": 4,
      "options": [
        {"valor": "secundaria", "etiqueta": "Secundaria"},
        {"valor": "preparatoria", "etiqueta": "Preparatoria / Bachillerato"},
        {"valor": "licenciatura", "etiqueta": "Licenciatura"},
        {"valor": "posgrado", "etiqueta": "Posgrado"}
      ]
    }
  ]
}
```

### Ejemplo JSON — inscripción

```json
POST /api/v1/courses/inscripcion/550e8400-e29b-41d4-a716-446655440000/

{
  "answers": [
    {"field_id": "uuid-campo-nombre", "value": "Juan Pérez"},
    {"field_id": "uuid-campo-email", "value": "juan@gobierno.mx"},
    {"field_id": "uuid-campo-sexo", "value": "masculino"},
    {"field_id": "uuid-campo-estudios", "value": "licenciatura"},
    {"field_id": "uuid-campo-skills", "value": ["excel", "word"]}
  ]
}

Response 201:
{
  "detail": "¡Inscripción exitosa!",
  "id": "registration-uuid"
}
```

---

## Instalación y despliegue

### 1. Servidor (Ubuntu 22.04)

```bash
# PostgreSQL
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb curso_db
sudo -u postgres createuser curso_user

# Redis
sudo apt install redis-server

# Python env
python3 -m venv /var/www/cursogov/venv
source /var/www/cursogov/venv/bin/activate
pip install -r requirements.txt
```

### 2. Variables de entorno

```bash
cp .env.example .env
# Editar .env con tus valores reales
```

### 3. Django

```bash
python manage.py migrate
python manage.py collectstatic --noinput

# Crear Site object para allauth
python manage.py shell -c "
from django.contrib.sites.models import Site
Site.objects.update_or_create(id=1, defaults={'domain': 'tusitio.com', 'name': 'CursoGov'})
"
```

### 4. Google OAuth — Consola de Google

1. Crear proyecto en console.cloud.google.com
2. APIs → OAuth 2.0 Client IDs
3. URIs de redireccionamiento autorizados:
   - `https://tusitio.com/accounts/google/login/callback/`

### 5. Microsoft OAuth — Azure Portal

1. Registrar app en portal.azure.com
2. Plataforma: Web
3. URI de redirección:
   - `https://tusitio.com/accounts/microsoft/login/callback/`

### 6. SocialApp en Django admin

```python
# O via management command / shell:
from allauth.socialaccount.models import SocialApp
from django.contrib.sites.models import Site

google_app = SocialApp.objects.create(
    provider='google',
    name='Google',
    client_id='YOUR_GOOGLE_CLIENT_ID',
    secret='YOUR_GOOGLE_SECRET',
)
google_app.sites.add(Site.objects.get(id=1))
```

### 7. Nginx + SSL

```bash
sudo certbot --nginx -d tusitio.com -d www.tusitio.com
sudo cp deployment/nginx.conf /etc/nginx/sites-available/cursogov
sudo ln -s /etc/nginx/sites-available/cursogov /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 8. Gunicorn como servicio

```bash
sudo cp deployment/cursogov.service /etc/systemd/system/
sudo systemctl enable cursogov
sudo systemctl start cursogov
```

### 9. Frontend (React)

```bash
cd frontend
npm install
VITE_API_URL=https://tusitio.com/api/v1 npm run build
sudo cp -r dist /var/www/cursogov/frontend/
```

---

## Seguridad — puntos clave

| Medida | Implementación |
|--------|---------------|
| Sin contraseñas | `set_unusable_password()` + NoPasswordAdapter |
| Aislamiento de datos | Todos los querysets filtran por `administrador=request.user` |
| Sin SuperAdmin visible | No existe ruta ni interfaz expuesta |
| QR → solo inscripciones | El token QR no da acceso admin |
| IDs ocultos | UUIDs, nunca IDs secuenciales en URLs públicas |
| Rate limiting | Nginx + DRF throttling |
| CSRF | `CSRF_COOKIE_SECURE=True` + CORS restringido |
| XSS | `X-XSS-Protection` header + DRF serialización |
| Archivos de diploma | Acceso `/media/diplomas/` bloqueado en Nginx |
| HTTPS | SSL obligatorio + HSTS preload |

---

## Estructura de archivos

```
curso-system/
├── backend/
│   ├── config/
│   │   ├── settings.py
│   │   └── urls.py
│   ├── apps/
│   │   ├── accounts/
│   │   │   ├── models.py       # Administrator
│   │   │   ├── adapters.py     # OAuth adapters
│   │   │   ├── serializers.py  # + QR base64
│   │   │   ├── views.py
│   │   │   └── urls.py
│   │   ├── courses/
│   │   │   ├── models.py       # Course + formulario dinámico
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   └── urls.py
│   │   └── diplomas/
│   │       ├── models.py
│   │       ├── views.py
│   │       └── urls.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── hooks/useAuth.jsx
│       ├── utils/api.js
│       ├── pages/
│       │   ├── LandingPage.jsx
│       │   ├── AdminLoginPage.jsx
│       │   ├── OAuthCallbackPage.jsx
│       │   ├── DashboardPage.jsx
│       │   ├── CoursesPage.jsx
│       │   ├── CourseDetailPage.jsx
│       │   ├── StatisticsPage.jsx
│       │   └── ConfigPage.jsx
│       └── components/
│           ├── dashboard/DashboardLayout.jsx
│           └── forms/DynamicFormRenderer.jsx
└── deployment/
    ├── nginx.conf
    └── cursogov.service
```
