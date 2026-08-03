# HireFlow API
Versión: 0.1.0
Base URL
http://localhost:3000/api

---

**Nota de esta actualización (Agosto 2026):** se corrige la ruta de login (estaba documentada como `/auth/login`, pero el código real la implementa bajo `/users/login`) y se documentan los endpoints de Users tal como existen hoy.

---

# Autenticación
La mayoría de endpoints requieren JWT.
Header:
Authorization: Bearer <token>

Duración del token: 1 hora (`expiresIn: "1h"` en la generación del JWT). Pasado ese tiempo, hay que volver a hacer login.

---

# AUTH / USERS

## Registro
POST /users
Body
{
    "name":"Ana",
    "email":"ana@hireflow.com",
    "password":"123456",
    "role":"candidate"
}
Respuesta
201 Created
{
    "id": 1,
    "name": "Ana",
    "email": "ana@hireflow.com",
    "role": "candidate"
}
Errores
400 — email ya registrado: `{"message":"El email ya está registrado"}`
Autenticación
No requerida

---

## Login
POST /users/login

**Nota:** esta ruta está bajo `/users`, no bajo `/auth` como se documentó originalmente. Si se quiere mover a `/auth/login` en el futuro por convención REST, es un cambio de arquitectura a decidir y registrar en `docs/decisions.md` antes de tocar el código.

Body
{
    "email": "ana@hireflow.com",
    "password": "123456"
}
Respuesta
200 OK
{
    "message": "contraseña correcta",
    "token": "JWT..."
}
Errores
400 — usuario no encontrado: `{"message":"Usuario no encontrado"}`
400 — contraseña incorrecta: `{"message":"contraseña incorrecta"}`
500 — error interno (ej. JWT_SECRET no configurado en .env)
Autenticación
No requerida

---

## Obtener usuarios
GET /users
Respuesta
200 OK
[
    {
        "id": 1,
        "name": "Ana",
        "email": "ana@hireflow.com",
        "role": "candidate",
        "sector": null,
        "phone": null,
        "location": null,
        "profile_visible": 1,
        "created_at": "...",
        "updated_at": "..."
    }
]
Nota de seguridad: la respuesta nunca incluye `password_hash` (corregido agosto 2026).
Autenticación
Requerida (verifyToken)
Estado
🟢 Implementado

---

## Perfil propio
GET /users/me
Respuesta
200 OK
{
    "id": 1,
    "name": "Ana",
    "email": "ana@hireflow.com",
    "role": "candidate",
    "sector": null,
    "phone": null,
    "location": null,
    "profile_visible": 1,
    "created_at": "...",
    "updated_at": "..."
}
Sin `password_hash`, igual que `GET /users`.
Autenticación
Requerida (verifyToken) — siempre devuelve el perfil del usuario del token, no admite consultar el perfil de otro usuario.
Estado
🟢 Implementado

---

## Actualizar perfil propio
PUT /users/me
Body (todos los campos opcionales, se actualizan solo los enviados)
{
    "name": "Ana Actualizada",
    "sector": "Tecnología",
    "phone": "600000000",
    "location": "Madrid",
    "profile_visible": false
}

**Fuera de alcance de este endpoint (decisión, ver `docs/decisions.md`):** cambio de `email` y `password` no se gestionan aquí — quedan para un endpoint dedicado más adelante (`PUT /users/me/password`, ya previsto como pendiente en `roadmap.md` bajo "Cambio de contraseña"), porque cambiar email/password implica validaciones adicionales (verificar contraseña actual, revalidar unicidad de email) que no queremos mezclar con una actualización de perfil simple.

Respuesta
200 OK
{
    "message": "Perfil actualizado correctamente"
}
Errores
400 — ningún campo válido enviado
Autenticación
Requerida (verifyToken) — solo puede actualizar el propio perfil, no admite `:id`.
Estado
🟢 Implementado

---

## Eliminar cuenta propia
DELETE /users/me
Respuesta
200 OK
{
    "message": "Cuenta eliminada correctamente"
}
Efecto en cascada (según `database.md`): se eliminan automáticamente `applications`, `user_profiles`, `calendar_events`, `contacts` del usuario (ON DELETE CASCADE). En `job_offers.created_by_user` se pone a NULL (ON DELETE SET NULL), la oferta no se borra.
Autenticación
Requerida (verifyToken) — solo puede eliminar la propia cuenta, no admite `:id`.
Estado
🟢 Implementado

---

# APPLICATIONS

Todas las rutas protegidas mediante `verifyToken`. Todas las operaciones sobre un recurso concreto (`GET/PUT/DELETE /applications/:id`) filtran internamente por `id` **y** por el `user_id` del usuario autenticado — un usuario nunca puede leer, modificar ni eliminar una postulación que no sea suya (fix de seguridad aplicado agosto 2026, antes existía una vulnerabilidad IDOR).

## Crear postulación
POST /applications
Body
{
    "job_offer_id": 1,
    "notes": "Oferta interesante",
    "status": "wishlist"
}
`status` es opcional, por defecto `"wishlist"`.

Respuesta
201 Created
{
    "id": 7,
    "user_id": 11,
    "job_offer_id": 1,
    "status": "wishlist",
    "notes": "Oferta interesante",
    "applied_date": null
}

**Nota sobre `applied_date`:** solo se rellena automáticamente si el `status` de creación ya es `"applied"`. Si es `"wishlist"` (o cualquier otro), queda `null`.

Errores
400 — `job_offer_id` no existe (constraint FK)

---

## Obtener todas
GET /applications
Respuesta
200 OK
[ ... ]
Devuelve únicamente las postulaciones del usuario autenticado.

---

## Obtener por ID
GET /applications/:id
Respuesta
200 OK
{ ... }
404
{
    "message":"Postulación no encontrada"
}
Se devuelve 404 (no 403) tanto si el ID no existe como si existe pero pertenece a otro usuario — no se revela la existencia de postulaciones ajenas.

---

## Actualizar
PUT /applications/:id
Body
{
    "status":"applied",
    "notes":"Entrevista el viernes"
}
Respuesta
200 OK
{
    "message":"Postulación actualizada correctamente"
}

**Nota sobre `applied_date`:** si el `status` enviado es `"applied"` y la postulación todavía no tenía `applied_date`, se rellena automáticamente con la fecha actual. Si ya tenía fecha (por ejemplo, viene de `interview` de vuelta a `applied`), no se sobrescribe.

---

## Eliminar
DELETE /applications/:id
Respuesta
200 OK
{
    "message":"Postulación eliminada correctamente"
}

---

# JOB OFFERS
Estado
🔴 Pendiente
Endpoints previstos
GET /jobs
GET /jobs/:id
POST /jobs
PUT /jobs/:id
DELETE /jobs/:id

---

# COMPANIES
Estado
🔴 Pendiente
Endpoints previstos
GET /companies
POST /companies
PUT /companies/:id
DELETE /companies/:id

---

# INTERVIEWS
Estado
🔴 Pendiente (tabla ya existe en BD, falta CRUD)
POST /interviews
GET /interviews
PUT /interviews/:id
DELETE /interviews/:id

---

# CALENDAR
Estado
🔴 Futuro
Integración Google Calendar

---

# AI
Estado
🔴 Futuro
POST /ai/cv-review
POST /ai/interview-feedback
POST /ai/interview-questions
POST /ai/job-match

Ver `FRONTEND_DESIGN.md` para el diseño de comportamiento condicionado por rol (candidate/company) de estos 4 endpoints — no se crean rutas separadas por rol.