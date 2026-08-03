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
🔴 Pendiente
Modelo
Controlador
Rutas
CRUD

Siguiente objetivo del sprint.
---
## Job Offers
Estado
🔴 Pendiente
Modelo
Controlador
Rutas
CRUD
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
---
## Interviews
Estado
🔴 No iniciado (tabla ya existe en BD, falta CRUD)
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
⬜ CRUD Companies — siguiente paso
⬜ Middleware de errores centralizado
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
████████░░░░░░░░░░ 40%
Frontend
░░░░░░░░░░░░░░░░░░ 0% (diseño cerrado)
Base de datos
██████████████░░░ 75%
Documentación
████████████████░░ 90%
Proyecto completo
████████░░░░░░░░░░ 32%