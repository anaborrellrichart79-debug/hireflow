# HireFlow - CHANGELOG
Todas las modificaciones importantes del proyecto quedarán registradas aquí.
Formato basado en Keep a Changelog.

---

# [0.2.0] - Agosto 2026 — Seguridad, Users CRUD y documentación

## Seguridad
Corregida vulnerabilidad IDOR en Applications:
- `GET/PUT/DELETE /applications/:id` ahora filtran siempre por `id` Y `user_id`
- Antes, cualquier usuario autenticado podía leer/modificar/eliminar postulaciones de otros usuarios
- Verificado manualmente con dos usuarios de prueba (ver `docs/decisions.md`, entrada 001)

`getAllUsers` ya no expone `password_hash` en la respuesta de `GET /users`.

Eliminada `authentificateUser` de `models/User.js` — código muerto que comparaba contraseñas en texto plano contra el hash (nunca funcionaba, y era peligrosa si se llegaba a usar).

## Añadido
### Users
- `GET /users/me` — perfil propio
- `PUT /users/me` — actualizar perfil propio (campos: name, sector, phone, location, profile_visible)
- `DELETE /users/me` — eliminar cuenta propia
- Decisión de diseño: se usa `/users/me` en vez de `/users/:id` para evitar por diseño el mismo tipo de vulnerabilidad IDOR (ver `docs/decisions.md`, entrada 002)

### Documentación
- Creado `docs/decisions.md`
- Creado `FRONTEND_DESIGN.md` (diseño de pantallas basado en mockups de Canva)
- Creado `SPRINT_PLAN_2MESES.md`

## Corregido
### Base de datos (`shema.sql`)
- FK de `job_offers` corregida: `fk_job_company` apuntaba erróneamente a `created_by_user` en vez de `company_id`
- Corregido error de sintaxis (coma sobrante) en el enum de `interview_types`
- Typo `linkedln` → `linkedin`
- Renombradas 5 columnas `update_at` → `updated_at` para consistencia con el resto de tablas
- Recuperados 3 valores de enum perdidos en `interview_types` (`semistructured`, `follow-up`, `tension`)
- Base de datos real sincronizada con el archivo mediante `ALTER TABLE` (sin pérdida de datos)

### Applications
- `applied_date` ya no se rellena automáticamente al crear una postulación — solo se fija la primera vez que el status pasa a `applied`

### Limpieza
- Eliminados `console.log` de depuración en `server.js`, `createApplication` y `createNewApplication`
- Eliminada constante `APPLICATION_STATUS` duplicada en `applicationControllers.js` (ahora se importa desde `constants/`)
- `database.md` y `api.md` actualizados para reflejar el estado real del código (9 tablas documentadas que faltaban, ruta de login corregida de `/auth/login` a `/users/login`)

## Documentado (sin cambios de código)
- 9 tablas que ya existían en `shema.sql` pero no estaban en `database.md`: `user_profiles`, `application_notes`, `interview_types`, `interviews`, `calendar_events`, `contacts`, `ai_interview_questions`, `ai_resume_guides`, `ai_skill_improvement`

---

# [0.1.0] - Inicio del proyecto
## Backend
### Añadido
- Configuración inicial de Express.
- Conexión con MySQL mediante mysql2.
- Variables de entorno mediante dotenv.
- Middleware JWT.
- Organización MVC.

## Base de datos
Creada la base de datos:
hireflow
Tablas iniciales:
- users
- companies
- job_offers
- applications

## Auth
Implementado:
- Registro
- Login
- JWT
- Middleware verifyToken()
Estado:
✅ Funcional

## Applications
Implementado:
POST /applications
GET /applications
GET /applications/:id
PUT /applications/:id
DELETE /applications/:id
Estado:
CRUD completo funcionando.

## Postman
Creada colección profesional.
Módulos:
- Auth
- Users
- Applications
Variables:
base_url
token
Tests básicos implementados.

## Errores corregidos
### JWT
Error: jwt must be provided
Solución: Header Authorization correctamente implementado.

### Headers
Error: Cannot set headers after they are sent
Solución: Eliminar respuestas duplicadas.

### ENUM
Error: Data truncated for column status
Solución: status = wishlist

### Foreign Key
Error: Cannot add or update child row
Solución: Creación previa de Job Offer.

### Undefined Bind Parameters
Error: Bind parameters must not contain undefined
Solución: Corrección de req.user.id y job_offer_id

### Base de datos equivocada
Se detectó que la API estaba conectándose a una base distinta.
Solución: Verificación mediante console.log(process.env.DB_NAME)

## Refactor
Comenzado proceso de organización.
Nueva estructura:
constants/
services/
validators/
utils/

## Testing
Todas las pruebas realizadas mediante Postman.
Estado actual:
Auth ✔ Login ✔ JWT
Applications ✔ Create ✔ Read ✔ Read by ID ✔ Update ✔ Delete

# Próxima versión (0.3.0)
Objetivos:
- CRUD Companies
- CRUD Job Offers
- Relaciones empresa/ofertas
- Validaciones
- Manejo centralizado de errores