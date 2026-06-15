# Configuracion de seguridad para produccion

## Render

Configurar estas variables en el servicio del backend:

```env
DB_SSLMODE=require
COOKIE_SECURE=True
COOKIE_SAMESITE=None
JWT_COOKIE_SECURE=True
JWT_COOKIE_SAMESITE=None
RECAPTCHA_ENABLED=True
RECAPTCHA_SECRET_KEY=<clave-secreta-recaptcha-v2>
```

`CSRF_TRUSTED_ORIGINS` y `CORS_ALLOWED_ORIGINS` deben contener solamente la URL
real del frontend, por ejemplo:

```env
CSRF_TRUSTED_ORIGINS=https://ayuntamiento-formulario.vercel.app
CORS_ALLOWED_ORIGINS=https://ayuntamiento-formulario.vercel.app
```

El build de Render debe seguir ejecutando `python manage.py migrate`, ya que
Simple JWT agrega las tablas necesarias para revocar tokens de renovacion.

## Vercel

Configurar en el proyecto del frontend:

```env
VITE_API_URL=https://ayuntamientoformulario-1.onrender.com/api/v1
VITE_RECAPTCHA_SITE_KEY=<clave-publica-recaptcha-v2>
```

En Google reCAPTCHA se debe autorizar el dominio del frontend de Vercel.

## Cookies entre Vercel y Render

La autenticacion usa cookies `HttpOnly`, `Secure` y `SameSite=None` porque el
frontend y el backend estan en dominios diferentes. Algunos navegadores pueden
bloquear cookies de terceros. La solucion mas robusta es publicar el backend en
un subdominio del mismo dominio institucional que el frontend.
