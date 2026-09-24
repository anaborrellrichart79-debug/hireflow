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

# Errores

Todas las respuestas de error tienen al menos `{"message": "..."}`. Manejo centralizado (`middleware/errorMiddleware.js`, ver `docs/decisions.md`, entrada 007):
- Cualquier ruta no definida devuelve `404 {"message":"Ruta no encontrada: <método> <ruta>"}`.
- Los errores esperados (validación, duplicados, IDOR bloqueado, FK inválida) devuelven el mensaje específico documentado en cada endpoint, con status < 500.
- Cualquier error no controlado explícitamente devuelve siempre `500 {"message":"Error interno del servidor"}` — nunca se expone el mensaje interno del error ni detalles del driver de MySQL al cliente; el detalle completo se registra solo en el log del servidor.

## Errores de autenticación
Las rutas protegidas (`verifyToken`) responden 401 en tres casos:
- sin cabecera `Authorization`: `{"message":"No se proporcionó un token de autenticación"}`
- token caducado (dura 1 hora): `{"message":"La sesión ha caducado. Vuelve a iniciar sesión."}`
- token mal formado o firmado con otro secreto: `{"message":"Token de autenticación no válido"}`

El frontend trata cualquier 401 con token (fuera de `/users/login`) como sesión caducada: cierra la sesión y lleva al login (ver `docs/decisions.md`, entrada 025).

---

## Errores de validación

Todos los endpoints con body (`POST`/`PUT`) validan la entrada antes de llegar al controller (`express-validator`, ver `docs/decisions.md`, entrada 008). Si algún campo no cumple las reglas, la respuesta es siempre:
```
400 Bad Request
{
    "message": "Datos de entrada no válidos",
    "errors": [
        { "field": "email", "message": "email no es válido" },
        { "field": "password", "message": "password debe tener al menos 6 caracteres" }
    ]
}
```
Las reglas de cada campo (obligatorio/opcional, tipo, longitud máxima, valores permitidos) están documentadas en cada endpoint más abajo.

---

# AUTH / USERS

## Registro
POST /users
Body
{
    "name":"Ana",
    "email":"ana@hireflow.com",
    "password":"clave2026",
    "role":"candidate",
    "termsAccepted": true
}
Validación
`name` obligatorio (máx. 100). `email` obligatorio, formato válido (máx. 150). `password` obligatorio, entre 8 y 72 caracteres, con al menos una letra y un número (72 es el máximo que bcrypt tiene en cuenta; ver `docs/decisions.md`, entrada 021). `role` opcional, debe ser `candidate` o `recruiter` si se envía.
Respuesta
201 Created
{
    "id": 1,
    "name": "Ana",
    "email": "ana@hireflow.com",
    "role": "candidate"
}
Errores
400 — validación (ver sección "Errores de validación")
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
Validación
`email` y `password` obligatorios; `email` debe tener formato válido.
Respuesta
200 OK
{
    "message": "Sesión iniciada",
    "token": "JWT..."
}
Errores
400 — validación (ver sección "Errores de validación")
401 — email no registrado o contraseña incorrecta, con el mismo mensaje en ambos casos para no revelar qué emails tienen cuenta: `{"message":"Email o contraseña incorrectos"}`
429 — más de 10 intentos fallidos desde la misma IP en 15 minutos (los logins correctos no cuentan): `{"message":"Demasiados intentos de inicio de sesión. Vuelve a intentarlo en unos minutos."}`. Incluye las cabeceras `RateLimit` y `RateLimit-Policy`.
500 — error interno (ej. JWT_SECRET no configurado en .env)
Autenticación
No requerida

---

## Obtener usuarios (eliminado)
GET /users
**Eliminado en septiembre 2026.** Devolvía el email y el teléfono de todos los usuarios a cualquiera con sesión iniciada, saltándose el consentimiento al postularse. Ninguna pantalla lo usaba. Ahora responde 404. Para el perfil propio: `GET /users/me`. Ver `docs/decisions.md`, entrada 018.
Estado
🔴 Eliminado

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
Sin `password_hash`.
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

Validación
Todos los campos opcionales, pero si se envían: `name` no puede ser cadena vacía (máx. 100). `sector` (máx. 100), `phone` (máx. 30) y `location` (máx. 120) deben ser texto. `profile_visible` debe ser `true`/`false`.

Respuesta
200 OK
{
    "message": "Perfil actualizado correctamente"
}
Errores
400 — validación (ver sección "Errores de validación")
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
    "consent": true,
    "signature": "Lucía Navarro"
}
`consent` (tiene que ser `true`) y `signature` (el nombre completo del candidato) son obligatorios: al postularse, la empresa recibe su nombre, email y teléfono (ver `docs/decisions.md`, entrada 017). `job_offer_id` y `notes` son opcionales.

**`status` no se acepta en la creación**; lo fija el controller (ver `docs/decisions.md`, entrada 023):
- **con `job_offer_id`** (postularse a una oferta de HireFlow): `"applied"`, con `applied_date` = hoy. La empresa la ve al momento en `/applications/recruiter`.
- **sin `job_offer_id`** (seguimiento personal de una oferta de fuera): `"wishlist"`, sin `applied_date`.

Validación
`job_offer_id` opcional, si se envía debe ser un entero válido. `notes` opcional, texto libre. `consent` debe ser `true`. `signature` obligatorio (máx. 150).

Respuesta
201 Created
{
    "id": 7,
    "user_id": 11,
    "job_offer_id": 1,
    "status": "applied",
    "notes": "Oferta interesante",
    "applied_date": "2026-09-24T18:56:05.420Z",
    "consent_share_contact": true,
    "signature_name": "Lucía Navarro",
    "consent_at": "2026-09-24T18:56:05.420Z"
}
Errores
400 — validación (ver sección "Errores de validación"), incluido no aceptar el consentimiento o no firmar
400 — `job_offer_id` no existe (constraint FK)
409 — el candidato ya tiene una postulación a esa oferta: `{"message":"Ya te has postulado a esta oferta"}` (restricción `uq_application_user_job`; ver `docs/decisions.md`, entrada 027). Los seguimientos personales, sin `job_offer_id`, se pueden repetir.

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

## Actualizar (candidato)
PUT /applications/:id
Body (update parcial: se cambia solo lo que se envía)
{
    "notes":"Entrevista el viernes"
}
Validación
`status` opcional (uno de: `wishlist`, `applied`, `interview`, `offer`, `rejected`). `notes` opcional. Hay que enviar al menos uno.

**Quién mueve el estado** (ver `docs/decisions.md`, entrada 023):
- En una postulación **a una oferta de HireFlow** (`job_offer_id` no nulo) el estado lo gestiona la empresa (`PUT /applications/:id/status`). El candidato puede cambiar sus notas, pero no el estado: si envía un `status` distinto del actual recibe 403. Si ya no le interesa, puede retirarla con `DELETE /applications/:id`.
- En un **seguimiento personal** (sin `job_offer_id`) el candidato mueve el estado libremente.

Guardar solo las notas no cambia `status_updated_by`, así que no borra el aviso de "actualizado por la empresa".

Respuesta
200 OK
{
    "message":"Postulación actualizada correctamente"
}
Errores
400 — validación (ver sección "Errores de validación"), o no se envía ningún campo
403 — intenta cambiar el estado de una postulación a una oferta de HireFlow
404 — postulación no encontrada (o de otro usuario)

**Nota sobre `applied_date`:** si el `status` enviado es `"applied"` y la postulación todavía no tenía `applied_date`, se rellena automáticamente con la fecha actual. Si ya tenía fecha, no se sobrescribe.

---

## Cambiar estado (empresa)
PUT /applications/:id/status
Body
{
    "status": "interview"
}
Solo el recruiter que publicó la oferta de la postulación. Marca el cambio como de la empresa (`status_updated_by = "recruiter"`, `status_seen_by_candidate = 0`), así que el candidato lo ve como novedad en Home y en Mis postulaciones. No toca las notas privadas del candidato.

Validación
`status` obligatorio, uno de: `applied`, `interview`, `offer`, `rejected`. `wishlist` no se admite: la empresa no puede devolver a nadie a "Interesa" (ver `docs/decisions.md`, entrada 023).

Respuesta
200 OK
{
    "message": "Estado actualizado. El candidato lo verá reflejado en sus postulaciones."
}
Errores
400 — validación
403 — autenticado pero no es `recruiter`
404 — postulación no encontrada o de una oferta de otro recruiter
Autenticación
Requerida (verifyToken) + role `recruiter`

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

Todas las rutas requieren `verifyToken`. `POST`, `PUT` y `DELETE` requieren además `role = "recruiter"` (mismo modelo de permisos que Companies, ver `docs/decisions.md`, entrada 004). No hay restricción por `company_id`: cualquier `recruiter` puede gestionar ofertas de cualquier empresa (varios usuarios de una misma empresa pueden publicar ofertas, ver `Database.md`).

## Crear oferta
POST /jobs
Body
{
    "company_id": 3,
    "title": "Backend Developer",
    "description": "Oferta de prueba",
    "salary": "30000-40000",
    "location": "Remoto",
    "employment_type": "full_time",
    "skills_required": "Node.js, MySQL",
    "source": "internal",
    "external_url": null
}
`company_id` y `title` son obligatorios. El resto es opcional. `source` por defecto es `"internal"`.

`created_by_user` **no** se acepta del body — se fija siempre al `id` del usuario autenticado (ver `docs/decisions.md`, entrada 004).

`company_id` tiene que ser una empresa **del propio recruiter** (`companies.created_by_user`); no se puede publicar a nombre de la empresa de otro (ver `docs/decisions.md`, entrada 019).

Validación
`company_id` obligatorio, entero válido. `title` obligatorio (máx. 150). `salary` (máx. 100), `location` (máx. 120), `employment_type` (máx. 50) opcionales. `source` opcional, debe ser una de `internal`/`linkedin`/`api`. `external_url` opcional, debe ser una URL válida si se envía.

Respuesta
201 Created
{
    "id": 6,
    "company_id": 3,
    "title": "Backend Developer",
    ...
    "created_by_user": 7
}
Errores
400 — validación (ver sección "Errores de validación")
400 — `company_id` no existe o no es del recruiter: `{"message":"La empresa indicada (company_id) no existe o no es tuya"}`
403 — autenticado pero no es `recruiter`
Autenticación
Requerida (verifyToken) + role `recruiter`

---

## Obtener todas
GET /jobs
Respuesta
200 OK
[ ... ]
Autenticación
Requerida (verifyToken)

---

## Obtener por ID
GET /jobs/:id
Respuesta
200 OK
{ ... }
404
{
    "message":"Oferta no encontrada"
}
Autenticación
Requerida (verifyToken)

---

## Actualizar
PUT /jobs/:id
Body (todos los campos opcionales, se actualizan solo los enviados)
{
    "salary": "40000-50000"
}
`created_by_user` no es actualizable — no se puede reasignar la autoría de una oferta.
Si se envía `company_id`, debe ser la empresa actual de la oferta o una empresa del propio recruiter.

Validación
Mismas reglas que en la creación, pero todos los campos opcionales (solo se validan los que se envían).
Respuesta
200 OK
{
    "message":"Oferta actualizada correctamente"
}
Errores
400 — validación (ver sección "Errores de validación")
400 — ningún campo válido enviado, o `company_id` no existe
404 — oferta no encontrada (o no es del recruiter), o el nuevo `company_id` no es del recruiter
403 — autenticado pero no es `recruiter`
Autenticación
Requerida (verifyToken) + role `recruiter`

---

## Eliminar
DELETE /jobs/:id
Respuesta
200 OK
{
    "message":"Oferta eliminada correctamente"
}
Errores
404 — oferta no encontrada
403 — autenticado pero no es `recruiter`
Autenticación
Requerida (verifyToken) + role `recruiter`

---

# COMPANIES

Todas las rutas requieren `verifyToken`. `POST`, `PUT` y `DELETE` requieren además `role = "recruiter"` (ver `docs/decisions.md`, entrada 003) — un `candidate` autenticado puede leer pero no escribir. Cada empresa guarda quién la creó (`created_by_user`): solo ese recruiter puede editarla o borrarla. La lectura sigue siendo un catálogo compartido (ver `docs/decisions.md`, entrada 019).

## Crear empresa
POST /companies
Body
{
    "name": "Acme Inc",
    "email": "contacto@acme.com",
    "description": "Empresa de tecnología",
    "industry": "Tech",
    "location": "Madrid",
    "phone": "600000000"
}
Solo `name` y `email` son obligatorios (constraint de la BD), el resto es opcional. `created_by_user` no se acepta del body: se fija al `id` del usuario autenticado.

Validación
`name` obligatorio (máx. 150). `email` obligatorio, formato válido (máx. 150). `industry` (máx. 120), `location` (máx. 120), `phone` (máx. 30) opcionales.

Respuesta
201 Created
{
    "id": 2,
    "name": "Acme Inc",
    "email": "contacto@acme.com",
    "description": "Empresa de tecnología",
    "industry": "Tech",
    "location": "Madrid",
    "phone": "600000000",
    "created_by_user": 7
}
Errores
400 — validación (ver sección "Errores de validación")
400 — email ya registrado: `{"message":"El email de la empresa ya está registrado"}`
403 — autenticado pero no es `recruiter`: `{"message":"No tienes permisos para realizar esta acción"}`
Autenticación
Requerida (verifyToken) + role `recruiter`

---

## Obtener todas
GET /companies
Respuesta
200 OK
[ ... ]
Devuelve todas las empresas (no hay filtrado por usuario, es un catálogo compartido).
Autenticación
Requerida (verifyToken)

---

## Obtener por ID
GET /companies/:id
Respuesta
200 OK
{ ... }
404
{
    "message":"Empresa no encontrada"
}
Autenticación
Requerida (verifyToken)

---

## Actualizar
PUT /companies/:id
Body (todos los campos opcionales, se actualizan solo los enviados)
{
    "location": "Barcelona"
}
Validación
Mismas reglas que en la creación, pero todos los campos opcionales (solo se validan los que se envían).
Respuesta
200 OK
{
    "message":"Empresa actualizada correctamente"
}
Errores
400 — validación (ver sección "Errores de validación")
400 — ningún campo válido enviado, o email duplicado
404 — empresa no encontrada o no es del recruiter
403 — autenticado pero no es `recruiter`
Autenticación
Requerida (verifyToken) + role `recruiter`

---

## Eliminar
DELETE /companies/:id
Respuesta
200 OK
{
    "message":"Empresa eliminada correctamente"
}
Errores
404 — empresa no encontrada o no es del recruiter
409 — la empresa aún tiene ofertas: `{"message":"La empresa tiene ofertas publicadas. Bórralas antes de eliminar la empresa."}` (borrarla arrastraría en cascada las ofertas y las postulaciones de los candidatos)
403 — autenticado pero no es `recruiter`
Autenticación
Requerida (verifyToken) + role `recruiter`

---

# INTERVIEWS

Todas las rutas protegidas mediante `verifyToken`. `interviews` no tiene `user_id` propio — su dueño es el usuario de la `application` a la que pertenece. Todas las operaciones filtran siempre por propiedad heredada de `applications` en la propia query SQL (`JOIN`), nunca en el controller tras leer el registro (mismo patrón que Applications, ver `docs/decisions.md`, entrada 005).

## Crear entrevista
POST /interviews
Body
{
    "application_id": 5,
    "interview_type_id": null,
    "scheduled_date": "2026-09-01 10:00:00",
    "location": "Oficina",
    "notes": "Primera entrevista"
}
`application_id` y `scheduled_date` son obligatorios. `interview_type_id` es opcional (catálogo `interview_types`, poblado con 14 valores desde agosto 2026, ver `docs/decisions.md`, entrada 006).

Validación
`application_id` obligatorio, entero válido. `scheduled_date` obligatorio, formato `YYYY-MM-DD HH:mm:ss` (o con `T` en vez de espacio). `interview_type_id` opcional, entero válido. `location` opcional (máx. 150). `notes` opcional, texto libre.

Respuesta
201 Created
{
    "id": 1,
    "application_id": 5,
    "interview_type_id": null,
    "scheduled_date": "2026-09-01 10:00:00",
    "location": "Oficina",
    "notes": "Primera entrevista"
}
Errores
400 — validación (ver sección "Errores de validación")
404 — `application_id` no existe o pertenece a otro usuario: `{"message":"Postulación no encontrada"}` (no revela si el ID existe pero es ajeno)
400 — `interview_type_id` no existe (constraint FK)
Autenticación
Requerida (verifyToken)

**`GET /interviews`** devuelve, para el candidato, además `job_offer_id`, `job_title` y `company_name` de cada entrevista (`null` si la postulación no tiene oferta); para el recruiter, `job_offer_id`, `job_title` y `candidate_name`.

**Cuando la agenda la empresa** (recruiter), la postulación pasa además a `"interview"` si estaba en `"wishlist"` o `"applied"`, y se avisa al candidato igual que con un cambio de estado manual. Si ya estaba en `"offer"` o `"rejected"` no se toca. Las dos cosas van en una transacción. La respuesta incluye `"application_status_changed": true|false` (ver `docs/decisions.md`, entrada 023).

---

## Obtener todas
GET /interviews
Respuesta
200 OK
[ ... ]
Devuelve únicamente las entrevistas de postulaciones del usuario autenticado, ordenadas por `scheduled_date` ascendente.
Autenticación
Requerida (verifyToken)

---

## Obtener por ID
GET /interviews/:id
Respuesta
200 OK
{ ... }
404
{
    "message":"Entrevista no encontrada"
}
Se devuelve 404 tanto si el ID no existe como si pertenece a otro usuario.
Autenticación
Requerida (verifyToken)

---

## Actualizar
PUT /interviews/:id
Body (todos los campos opcionales, se actualizan solo los enviados)
{
    "location": "Oficina Central"
}
`application_id` no es actualizable — no se reasigna una entrevista a otra postulación desde un update simple.

Validación
Mismas reglas que en la creación (salvo `application_id`, que no aplica), todos los campos opcionales.
Respuesta
200 OK
{
    "message":"Entrevista actualizada correctamente"
}
Errores
400 — validación (ver sección "Errores de validación")
400 — ningún campo válido enviado, o `interview_type_id` no existe
404 — entrevista no encontrada (o de otro usuario)
Autenticación
Requerida (verifyToken)

---

## Eliminar
DELETE /interviews/:id
Respuesta
200 OK
{
    "message":"Entrevista eliminada correctamente"
}
Errores
404 — entrevista no encontrada (o de otro usuario)
Autenticación
Requerida (verifyToken)

---

# CALENDAR

CRUD de `calendar_events` (eventos propios del usuario, opcionalmente ligados a una `application`). La integración con Google Calendar sigue siendo futura — esto es solo la representación interna (ver `Database.md`). Todas las rutas requieren `verifyToken`. `calendar_events` tiene `user_id` propio, así que todas las operaciones filtran por `id` + `user_id`, mismo patrón que Applications.

## Crear evento
POST /calendar
Body
{
    "title": "Entrevista técnica",
    "description": "Entrevista con el equipo de backend",
    "event_type": "interview",
    "related_application": 9
}
`title` es obligatorio. `description`, `event_type` (por defecto `"reminder"`) y `related_application` son opcionales.

**`related_application` se valida por propiedad, no solo por existencia** (ver `docs/decisions.md`, entrada 009): si se envía, debe ser el `id` de una `application` del propio usuario — si no existe o pertenece a otro usuario, se rechaza con el mismo mensaje en ambos casos (no revela si el ID existe).

Validación
`title` obligatorio (máx. 150). `description` opcional, texto libre. `event_type` opcional, debe ser una de `interview`/`job_search`/`reminder`/`meeting`. `related_application` opcional, entero válido.

Respuesta
201 Created
{
    "id": 1,
    "user_id": 17,
    "title": "Entrevista técnica",
    "description": "Entrevista con el equipo de backend",
    "event_type": "interview",
    "related_application": 9
}
Errores
400 — validación (ver sección "Errores de validación")
400 — `related_application` no existe o no es tuya: `{"message":"La postulación indicada (related_application) no existe o no te pertenece"}`
Autenticación
Requerida (verifyToken)

---

## Obtener todos
GET /calendar
Respuesta
200 OK
[ ... ]
Devuelve únicamente los eventos del usuario autenticado.
Autenticación
Requerida (verifyToken)

---

## Obtener por ID
GET /calendar/:id
Respuesta
200 OK
{ ... }
404
{
    "message":"Evento no encontrado"
}
Se devuelve 404 tanto si el ID no existe como si pertenece a otro usuario.
Autenticación
Requerida (verifyToken)

---

## Actualizar
PUT /calendar/:id
Body (todos los campos opcionales, se actualizan solo los enviados)
{
    "title": "Entrevista técnica (reprogramada)"
}
Validación
Mismas reglas que en la creación, todos los campos opcionales.
Respuesta
200 OK
{
    "message":"Evento actualizado correctamente"
}
Errores
400 — validación, o `related_application` no existe/no es tuya
404 — evento no encontrado (o de otro usuario)
Autenticación
Requerida (verifyToken)

---

## Eliminar
DELETE /calendar/:id
Respuesta
200 OK
{
    "message":"Evento eliminado correctamente"
}
Errores
404 — evento no encontrado (o de otro usuario)
Autenticación
Requerida (verifyToken)

---

# AI

**Importante:** estos 4 endpoints son consultas sobre las tablas catálogo (`ai_interview_questions`, `ai_resume_guides`, `ai_skill_improvement`), **no** llamadas a un LLM externo — no hay ninguna API key de IA configurada en el proyecto (ver `docs/decisions.md`, entrada 010). Todas las rutas requieren `verifyToken`.

## Revisión de CV
POST /ai/cv-review
Body
{
    "industry": "startups",
    "company_type": "programación, marketing, Data Science, Fintech"
}
`industry` es obligatorio. `company_type` es opcional — si se envía, se busca coincidencia exacta de ambos; si no hay resultados (o no se envía `industry` reconocido), se devuelven las guías genéricas (`industry: "none"`).

Validación
`industry` obligatorio (máx. 120). `company_type` opcional (máx. 120).

Respuesta
200 OK
{
    "industry": "startups",
    "company_type": null,
    "guides": [ { "id": 4, "industry": "startups", "company_type": "...", "recomendations": "...", "created_at": "..." } ]
}
Errores
400 — validación (ver sección "Errores de validación")
Autenticación
Requerida (verifyToken)

---

## Preguntas de entrevista
POST /ai/interview-questions
Body
{
    "category": "technical",
    "difficulty": "intermediate",
    "limit": 5
}
Todos los campos opcionales. Sin filtros, devuelve una muestra aleatoria del catálogo completo.

Validación
`category` opcional, una de `personal`/`technical`/`behavioral`/`stress`/`culture_fit`. `difficulty` opcional, una de `basic`/`intermediate`/`advanced`. `limit` opcional, entero entre 1 y 50 (por defecto 10).

Respuesta
200 OK
{
    "count": 5,
    "questions": [ { "id": 8, "question": "...", "category": "technical", "difficulty": "intermediate", "example_answer": null, "created_at": "..." } ]
}
Errores
400 — validación (ver sección "Errores de validación")
Autenticación
Requerida (verifyToken)

---

## Feedback / consejos de mejora
POST /ai/interview-feedback
Body
{
    "skills": ["liderazgo", "comunicación"]
}
Busca en `ai_skill_improvement` coincidencias parciales (`LIKE`) para cada skill indicada. Una skill sin coincidencia en el catálogo simplemente no aparece en la respuesta (no es un error).

Validación
`skills` obligatorio, array con al menos 1 elemento; cada elemento debe ser texto no vacío.

Respuesta
200 OK
{
    "requested_skills": ["liderazgo", "comunicación"],
    "suggestions": [ { "id": 6, "skill_name": "Liderazgo e Influencia", "description": "...", "improvement_methods": "...", "resources": "...", "created_at": "..." } ]
}
Errores
400 — validación (ver sección "Errores de validación")
Autenticación
Requerida (verifyToken)

---

## Match con una oferta
POST /ai/job-match
Body
{
    "job_offer_id": 10,
    "skills": "Node.js, MySQL, Docker"
}
Compara el texto de `skills_required` de la oferta indicada contra las `skills` que envía el candidato (texto libre), por solapamiento de palabras — no lee de un perfil guardado, ver nota abajo.

**Nota:** no se compara contra `user_profiles` porque ese recurso todavía no tiene CRUD implementado (ver `docs/decisions.md`, entrada 010) — las `skills` se envían siempre en el body. Cuando exista el CRUD de perfil, este endpoint podrá leerlas de ahí.

**Limitación conocida:** el matching es solo solapamiento de palabras, sin detectar negación ni contexto — escribir "no tengo experiencia en Docker" cuenta "docker" como coincidencia igualmente. Es una primera versión a ampliar más adelante.

Validación
`job_offer_id` obligatorio, entero válido. `skills` obligatorio, texto (máx. 2000 caracteres).

Respuesta
200 OK
{
    "job_offer_id": 10,
    "score": 75,
    "matched_skills": ["node.js", "mysql", "docker"],
    "missing_skills": ["liderazgo"],
    "improvement_suggestions": [ { "id": 6, "skill_name": "Liderazgo e Influencia", "...": "..." } ]
}
`score` es el porcentaje (0-100) de palabras de `skills_required` encontradas en las `skills` del candidato; `null` si la oferta no tiene `skills_required`.
Errores
400 — validación (ver sección "Errores de validación")
404 — oferta no encontrada: `{"message":"Oferta no encontrada"}`
Autenticación
Requerida (verifyToken)