# HireFlow - CHANGELOG
Todas las modificaciones importantes del proyecto quedarán registradas aquí.
Formato basado en Keep a Changelog.

---

# [0.7.0] - Agosto 2026 — Validaciones de entrada

## Añadido
- Dependencia `express-validator`
- `middleware/validate.js` — corta la petición con 400 si falla algún validador
- `validators/userValidators.js`, `validators/companyValidators.js`, `validators/jobOfferValidators.js`, `validators/applicationValidators.js`, `validators/interviewValidators.js` — reglas de creación y actualización por recurso (obligatorio/opcional, formato, longitud máxima según columnas reales de `shema.sql`, valores de ENUM permitidos)
- Formato de respuesta de error de validación consistente: `{"message":"Datos de entrada no válidos","errors":[{"field":...,"message":...}]}`

## Corregido
- `PUT /applications/:id` ahora exige `status` obligatorio, lo que convierte un bug de bind `undefined` (omitir `status` tumbaba la petición con 500 porque `updateApplication` sobreescribe siempre ambos campos) en un 400 claro. `notes = null` añadido como valor por defecto en `updateApplication` (`models/application.js`) para que omitir `notes`, que sí es opcional, tampoco falle
- Documentación de `POST /applications` corregida: no acepta `status` en el body (el controller siempre fuerza `"wishlist"` al crear), la documentación anterior sugería erróneamente que era configurable

Detalle y alternativas consideradas en `docs/decisions.md`, entrada 008.

---

# [0.6.0] - Agosto 2026 — Middleware de errores centralizado

## Añadido
- `middleware/asyncHandler.js` — envuelve controllers async y reenvía cualquier error a `next()`, sin try/catch repetido
- `middleware/errorMiddleware.js` — `notFound` (404 para rutas no definidas) + `errorHandler` (handler final de errores de Express)
- Todas las rutas (`userRoutes.js`, `applicationRoutes.js`, `companyRoutes.js`, `jobOfferRoutes.js`, `interviewRoutes.js`) envuelven ahora sus handlers con `asyncHandler`
- `server.js` registra `notFound` + `errorHandler` después de todas las rutas

## Cambiado
- Los 5 controllers eliminan el `try/catch` repetido en cada función; solo se mantiene `try/catch` local donde el mensaje de error debe ser específico del recurso (email duplicado, FK inválida con nombre de campo), relanzando el error en cualquier otro caso

## Seguridad
- Corregida una fuga de información: `createNewApplication` devolvía `error.message` y el objeto `error` completo del driver de MySQL al cliente en cualquier fallo inesperado; `createNewCompany`/`createNewJobOffer`/`createNewInterview` tenían el mismo problema en su rama de error genérica. Ahora cualquier error no controlado explícitamente (`status` ausente o ≥ 500) responde siempre `{"message":"Error interno del servidor"}`, sin exponer detalles internos — el detalle completo solo se registra server-side vía `console.error`

Detalle completo de la decisión y alternativas consideradas en `docs/decisions.md`, entrada 007.

---

# [0.5.1] - Agosto 2026 — Corrección de bugs detectados en 0.5.0

## Corregido
- `createApplication` (`models/application.js`) ya no falla con "Bind parameters must not contain undefined" al omitir `job_offer_id` o `notes` del body — ahora tienen `null` por defecto, igual que en los modelos de Companies/Job Offers/Interviews
- `database/seed.sql`: corregido el `INSERT` de `interview_types`, que usaba columnas (`name`/`description`) que no existen en el esquema real y valores incompatibles con el ENUM `name_interview_types`. Se mapearon las 14 categorías originales en español al valor de ENUM más cercano, conservando la descripción en español (ver `docs/decisions.md`, entrada 006)
- Ejecutado el `INSERT` corregido contra la BD real: `interview_types` pasó de 0 a 14 filas

---

# [0.5.0] - Agosto 2026 — CRUD Interviews

## Añadido
### Interviews
- `GET /interviews` — listar entrevistas del usuario autenticado (vía `JOIN` con `applications`)
- `GET /interviews/:id` — obtener una entrevista propia
- `POST /interviews` — crear entrevista sobre una `application` propia; usa `INSERT ... SELECT` para que la propiedad se compruebe en la propia query, no en el controller
- `PUT /interviews/:id` — actualizar entrevista propia, solo campos enviados (`application_id` no reasignable)
- `DELETE /interviews/:id` — eliminar entrevista propia
- Aplica el mismo patrón de filtrado por propiedad en SQL que Applications (ver `docs/decisions.md`, entrada 005), ya que `interviews` no tiene `user_id` propio — hereda el dueño de su `application`

## Hallazgo (corregido en 0.5.1)
- `interview_types` está vacía en la BD real: `database/seed.sql` usa columnas `name`/`description` que no existen en la tabla (el esquema real usa `name_interview_types`/`description_interview_types`). No bloquea Interviews porque `interview_type_id` es opcional.

---

# [0.4.0] - Agosto 2026 — CRUD Job Offers

## Añadido
### Job Offers
- `GET /jobs` — listar todas (cualquier usuario autenticado)
- `GET /jobs/:id` — obtener una oferta (cualquier usuario autenticado)
- `POST /jobs` — crear oferta (solo `role = "recruiter"`), `created_by_user` se fija siempre por servidor a partir del token, nunca del body
- `PUT /jobs/:id` — actualizar oferta, solo campos enviados (solo `role = "recruiter"`), `created_by_user` no es reasignable
- `DELETE /jobs/:id` — eliminar oferta (solo `role = "recruiter"`)
- Mismo modelo de permisos que Companies, reutilizando `requireRole` (ver `docs/decisions.md`, entrada 004)

---

# [0.3.0] - Agosto 2026 — CRUD Companies y control de acceso por rol

## Añadido
### Companies
- `GET /companies` — listar todas (cualquier usuario autenticado)
- `GET /companies/:id` — obtener una empresa (cualquier usuario autenticado)
- `POST /companies` — crear empresa (solo `role = "recruiter"`)
- `PUT /companies/:id` — actualizar empresa, solo campos enviados (solo `role = "recruiter"`)
- `DELETE /companies/:id` — eliminar empresa (solo `role = "recruiter"`)
- Nuevo `middleware/roleMiddleware.js` (`requireRole`), primer control de acceso basado en rol del proyecto — reutilizable para Job Offers y rutas de `admin` (ver `docs/decisions.md`, entrada 003)

### Limpieza
- Eliminados `console.log` de depuración reintroducidos en `server.js`

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

# Próxima versión (0.8.0)
Objetivos:
- Frontend (ver `FRONTEND_DESIGN.md` y `SPRINT_PLAN_2MESES.md`)