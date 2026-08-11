# HireFlow Project Status
Última actualización
Agosto 2026
---
# Backend
## Configuración
Estado
🟢 Completado
Express
JWT
dotenv
mysql2
MVC
---
## Auth
Estado
🟢 Completado
Login
Registro
JWT
Middleware
Tests Postman
---
## Manejo de errores
Estado
🟢 Completado
✔ `middleware/asyncHandler.js` — envuelve controllers async, reenvía errores a `next()`
✔ `middleware/errorMiddleware.js` — `notFound` (404 rutas no definidas) + `errorHandler` centralizado
✔ Los 5 controllers ya no repiten `try/catch` genérico; solo lo mantienen donde el mensaje debe ser específico del recurso
✔ Corregida fuga de información: los 500 no controlados ya no exponen `error.message` ni el objeto de error del driver de MySQL al cliente
✔ Tests manuales verificados (ruta inexistente, JSON malformado, regresión completa de los 5 recursos)

Decisión de arquitectura: ver `docs/decisions.md`, entrada 007.
---
## Users
Estado
🟢 CRUD Completo
✔ Crear (registro)
✔ Login
✔ Obtener perfil propio (GET /users/me)
✔ Actualizar perfil propio (PUT /users/me)
✔ Eliminar cuenta propia (DELETE /users/me)
✔ Obtener todos (GET /users)
✔ Tests manuales verificados (Postman)

Decisión de arquitectura: se usa `/users/me` en vez de `/users/:id` para evitar por diseño el mismo tipo de vulnerabilidad IDOR detectada y corregida en Applications (ver `docs/decisions.md`, entrada 002).
---
## Companies
Estado
🟢 CRUD Completo
✔ Crear (solo `recruiter`)
✔ Obtener todas
✔ Obtener por ID
✔ Actualizar (solo `recruiter`)
✔ Eliminar (solo `recruiter`)
✔ Tests manuales verificados (curl: permisos por rol, email duplicado, 404)

Decisión de arquitectura: primer control de acceso basado en rol del proyecto (`middleware/roleMiddleware.js`), ver `docs/decisions.md`, entrada 003.
---
## Job Offers
Estado
🟢 CRUD Completo
✔ Crear (solo `recruiter`, `created_by_user` fijado por servidor)
✔ Obtener todas
✔ Obtener por ID
✔ Actualizar (solo `recruiter`)
✔ Eliminar (solo `recruiter`)
✔ Tests manuales verificados (curl: permisos por rol, FK company_id inválida, 404)

Decisión de arquitectura: mismo modelo de permisos que Companies, ver `docs/decisions.md`, entrada 004.
---
## Applications
Estado
🟢 CRUD Completo
✔ Crear
✔ Obtener
✔ Obtener por ID
✔ Actualizar
✔ Eliminar
✔ Tests
✔ Fix de seguridad IDOR aplicado y verificado (agosto 2026, ver `docs/decisions.md` entrada 001)
✔ Comportamiento de `applied_date` corregido (no se autorellena al crear, solo al pasar a `applied`)
✔ Fix: `createApplication` ya no falla si se omiten `job_offer_id`/`notes` del body (ver `docs/decisions.md` entrada 006)
---
## Interviews
Estado
🟢 CRUD Completo
✔ Crear (sobre application propia, `INSERT ... SELECT` valida propiedad en la query)
✔ Obtener todas (propias, vía JOIN con applications)
✔ Obtener por ID (propia)
✔ Actualizar (propia)
✔ Eliminar (propia)
✔ Tests manuales verificados (curl: IDOR bloqueado con dos candidatos distintos en las 4 operaciones)

Decisión de arquitectura: `interviews` no tiene `user_id` propio, hereda el dueño de su `application`; filtrado por propiedad vía JOIN en la propia query SQL, mismo patrón que Applications (ver `docs/decisions.md`, entrada 005).

✔ Fix: `database/seed.sql` corregido y ejecutado contra la BD real — `interview_types` pasó de 0 a 14 filas con los nombres de columna y valores de ENUM correctos (ver `docs/decisions.md`, entrada 006)
---
## Calendar
Estado
🔴 No iniciado
---
## AI
Estado
🔴 No iniciado
---
# Frontend
Estado general
🔴 Sin comenzar (diseño ya cerrado en `FRONTEND_DESIGN.md`)
---
## Landing
⬜
---
## Login
⬜
---
## Dashboard
⬜
---
## Applications
⬜
---
## Jobs
⬜
---
## Companies
⬜
---
## Calendar
⬜
---
## Perfil
⬜
---
# Testing
Backend
🟢 Postman
Frontend
🔴 Pendiente
---
# Documentación
README
🟢
Architecture
🟢
Roadmap
🟢
Changelog
🟢
API
🟢 (actualizado agosto 2026, corregida ruta de login y documentados endpoints reales)
Database
🟢 (actualizado agosto 2026, documentadas 9 tablas que faltaban)
Project Status
🟢
Decisions
🟢 (creado agosto 2026)
Frontend Design
🟢 (creado agosto 2026)
Sprint Plan (2 meses)
🟢 (creado agosto 2026)
---
# Próximo objetivo
Sprint actual (Semana 1 → Semana 2 del plan de 2 meses)
Implementar:
✔ CRUD Users — completo
✔ Fix seguridad IDOR en Applications — completo
✔ CRUD Companies — completo
✔ CRUD Job Offers — completo
✔ CRUD Interviews — completo
✔ Fix bug `createApplication` (bind parameters undefined) — completo
✔ Fix `database/seed.sql` de `interview_types` — completo
✔ Middleware de errores centralizado — completo
⬜ Validaciones de entrada — siguiente paso
---
# Objetivo MVP
Un usuario podrá:
✔ Registrarse
✔ Iniciar sesión
✔ Gestionar su perfil
✔ Buscar ofertas
✔ Guardarlas
✔ Cambiar su estado
⬜ Gestionar entrevistas
⬜ Ver estadísticas
---
# Estado global
Backend
███████████████░░░░░ 75%
Frontend
░░░░░░░░░░░░░░░░░░ 0% (diseño cerrado)
Base de datos
██████████████░░░ 75%
Documentación
████████████████░░ 90%
Proyecto completo
██████████░░░░░░░░░░ 46%