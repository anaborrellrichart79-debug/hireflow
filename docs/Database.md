# HireFlow Database
Motor
MySQL 8
Base de datos
hireflow

---

**Nota de esta actualización (Agosto 2026):** este documento estaba desactualizado respecto al código real (`backend/database/shema.sql`). Se han añadido 9 tablas que ya existían en el schema pero no estaban documentadas, y se ha corregido la relación `job_offers`↔`companies` que tenía un error de FK ya solucionado (ver `docs/decisions.md`, entrada 001-003).

---

# Relación general

```
Users
    │
    │ 1:N
    ▼
Applications
    ▲
    │
    │ N:1
Job Offers
    ▲
    │
Companies
```

Tablas adicionales relacionadas:
```
Users ── 1:1 ── user_profiles
Applications ── 1:N ── application_notes
Applications ── 1:N ── interviews ── N:1 ── interview_types
Users ── 1:N ── calendar_events (opcionalmente ligado a applications)
Users ── 1:N ── contacts
```

Tablas de IA (`ai_interview_questions`, `ai_resume_guides`, `ai_skill_improvement`) son catálogos de contenido, sin FK hacia `users` — se consultan, no pertenecen a un usuario concreto.

---

# Tabla users

Campos
```
id
name
email
password_hash
role            -- ENUM('candidate','recruiter')
sector
phone
location
profile_visible  -- BOOLEAN, default true
created_at
updated_at
```

Relaciones
```
1 usuario
↓
muchas postulaciones (applications)
1:1 con user_profiles
```

**Pendiente (Semana 3 del sprint):** ampliar `role` a 3 valores (`candidate`, `recruiter`, `admin`) cuando se implemente el sistema de roles.

---

# Tabla user_profiles

Campos
```
id
user_id          -- FK → users(id), ON DELETE CASCADE
education
work_experience
skills
resume_url
about
created_at
updated_at
```

Relaciones
```
1 usuario
↓
1 perfil extendido (CV)
```

Corresponde a la pantalla "Formulario" (modo `profile`) de `FRONTEND_DESIGN.md`.

---

# Tabla companies

Campos
```
id
name
email
description
industry
location
phone
created_at
updated_at
```

Relaciones
```
1 empresa
↓
muchas ofertas (job_offers)
```

---

# Tabla job_offers

Campos
```
id
company_id         -- FK → companies(id), ON DELETE CASCADE
title
description
salary
location
employment_type
skills_required
source             -- ENUM('internal','linkedin','api'), default 'internal'
external_url
created_by_user    -- FK → users(id), ON DELETE SET NULL
created_at
updated_at
```

Relaciones
```
1 oferta
↓
muchas postulaciones (applications)
```

**Nota importante:** `company_id` y `created_by_user` son dos FKs distintas e independientes — `company_id` identifica a qué empresa pertenece la oferta, `created_by_user` identifica qué usuario concreto la creó (útil para auditoría, o si varios usuarios de la misma empresa pueden publicar ofertas). No confundir una con otra (hubo un error de este tipo corregido en agosto 2026, ver `docs/decisions.md`).

---

# Tabla applications

Campos
```
id
user_id
job_offer_id
status          -- ENUM('wishlist','applied','interview','offer','rejected'), default 'wishlist'
applied_date    -- DATE, nullable
notes
created_at
updated_at
```

ENUM status
```
wishlist
applied
interview
offer
rejected
```

Relaciones
```
N:1 Users
N:1 Job Offers
1:N application_notes
1:N interviews (vía application_id)
```

**Comportamiento de `applied_date` (decisión registrada en `docs/decisions.md`):** no se rellena automáticamente al crear el registro. Se queda en `NULL` mientras el status es `wishlist` (o cualquier otro). Se rellena automáticamente con la fecha actual **solo la primera vez** que el status pasa a `applied` (vía `PUT /applications/:id`), y no se sobrescribe en cambios de status posteriores.

**Seguridad:** todas las operaciones de lectura/escritura/borrado sobre una fila concreta (`GET/PUT/DELETE /applications/:id`) deben filtrar siempre por `id` **y** `user_id` a la vez, nunca solo por `id` (fix de IDOR aplicado en agosto 2026).

---

# Tabla application_notes

Campos
```
id
application_id   -- FK → applications(id), ON DELETE CASCADE
user_id          -- FK → users(id), ON DELETE CASCADE
note_text
created_at
```

Relaciones
```
1 postulación
↓
muchas notas
```

Corresponde a la pantalla "Notas/Contactos" de `FRONTEND_DESIGN.md`. Nota: `applications.notes` (campo simple) y esta tabla `application_notes` (histórico de notas múltiples) coexisten — a decidir en implementación si se usa una u otra, o ambas con propósitos distintos (uno = nota actual visible, otra = histórico).

---

# Tabla interview_types

Campos
```
id
name_interview_types   -- ENUM, default 'in_person'
description_interview_types
created_at
```

ENUM name_interview_types
```
structured
unstructured
semistructured
technique
telephone
online
in_person
group_dynamics
competency_based
behavioral
follow-up
tension
```

Catálogo fijo de tipos de entrevista, sin FK hacia otras tablas (es referenciada, no referencia).

---

# Tabla interviews

Campos
```
id
application_id      -- FK → applications(id), ON DELETE CASCADE
interview_type_id   -- FK → interview_types(id), ON DELETE SET NULL
scheduled_date       -- DATETIME, not null
location
notes
created_at
updated_at
```

Relaciones
```
1 postulación
↓
muchas entrevistas
```

Corresponde a la pantalla "Calendario semanal" de `FRONTEND_DESIGN.md`.

---

# Tabla calendar_events

Campos
```
id
user_id             -- FK → users(id), ON DELETE CASCADE
title
description
event_type          -- ENUM('interview','job_search','reminder','meeting'), default 'reminder'
related_application  -- FK → applications(id), ON DELETE SET NULL, nullable
created_at
updated_at
```

Relaciones
```
1 usuario
↓
muchos eventos de calendario (opcionalmente ligados a una postulación)
```

Pensada para la futura integración con Google Calendar (Semana 6 del sprint) — esta tabla sería la representación interna, sincronizada con eventos externos.

---

# Tabla contacts

Campos
```
id
user_id    -- FK → users(id), ON DELETE CASCADE
name
company
email
phone
notes
created_at
updated_at
```

Relaciones
```
1 usuario
↓
muchos contactos (reclutadores, referencias, etc.)
```

Corresponde también a la pantalla "Notas/Contactos" de `FRONTEND_DESIGN.md`.

---

# Tabla ai_interview_questions

Campos
```
id
question
category      -- ENUM('personal','technical','behavioral','stress','culture_fit')
difficulty    -- ENUM('basic','intermediate','advanced'), default 'basic'
example_answer
created_at
```

Catálogo de preguntas de entrevista usado por la función IA `interview-questions`. Sin FK hacia `users` — es contenido de referencia, no específico de un usuario.

---

# Tabla ai_resume_guides

Campos
```
id
industry
company_type
recomendations
created_at
```

Catálogo de guías de CV por industria, usado por la función IA `cv-review`.

**Nota menor:** el campo se llama `recomendations` (con una sola "m") — es un typo respecto a "recommendations", pero como ya está en producción/desarrollo, no se corrige salvo que se decida explícitamente renombrarlo (implica migración).

---

# Tabla ai_skill_improvement

Campos
```
id
skill_name
description
improvement_methods
resources
created_at
```

Catálogo de recursos de mejora de habilidades, usado por las funciones IA en general.

---

# Índices recomendados
```
users.email
applications.user_id
applications.job_offer_id
job_offers.company_id
job_offers.location
job_offers.title
interviews.application_id
calendar_events.user_id
contacts.user_id
```

---

# Integridad referencial

```
applications
  FK user_id        ON DELETE CASCADE
  FK job_offer_id    ON DELETE CASCADE

job_offers
  FK company_id       ON DELETE CASCADE
  FK created_by_user  ON DELETE SET NULL

interviews
  FK application_id     ON DELETE CASCADE
  FK interview_type_id  ON DELETE SET NULL

calendar_events
  FK user_id             ON DELETE CASCADE
  FK related_application ON DELETE SET NULL
```

---

# Próximas mejoras
Soft Delete
Auditoría
Historial de cambios
Migraciones
Seeds