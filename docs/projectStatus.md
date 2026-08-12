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
## Validaciones de entrada
Estado
🟢 Completado
✔ Dependencia `express-validator` añadida
✔ `middleware/validate.js` + un archivo de validadores por recurso en `validators/` (Users, Companies, Job Offers, Applications, Interviews)
✔ Reglas de creación y actualización: obligatorio/opcional, formato (email, entero, URL, fecha), longitud máxima según columnas reales de la BD, valores de ENUM permitidos
✔ Fix de paso: `PUT /applications/:id` exige `status` obligatorio, lo que bloquea con 400 un bug de bind `undefined` que antes producía un 500
✔ Tests manuales verificados en los 5 recursos (campos obligatorios, formatos inválidos, límites de longitud, casos válidos)

Decisión de arquitectura: ver `docs/decisions.md`, entrada 008.
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
🟢 CRUD Completo
✔ Crear (evento propio, `related_application` validado por propiedad, no solo por existencia)
✔ Obtener todos (propios)
✔ Obtener por ID (propio)
✔ Actualizar (propio)
✔ Eliminar (propio)
✔ Validación de entrada (title obligatorio, event_type ENUM, related_application entero)
✔ Tests manuales verificados (curl: IDOR bloqueado en `related_application` y en las 4 operaciones CRUD, con dos usuarios distintos)

Decisión de arquitectura: `related_application` se valida por propiedad reutilizando `getApplicationById`, no solo por la FK de la BD, ver `docs/decisions.md`, entrada 009. Integración real con Google Calendar sigue pendiente (fuera de alcance de este CRUD).
---
## AI
Estado
🟢 Completado (basado en catálogo, primera versión)
✔ `POST /ai/cv-review` — recomendaciones de `ai_resume_guides` por industria (con fallback genérico)
✔ `POST /ai/interview-questions` — preguntas de `ai_interview_questions` filtradas y aleatorias
✔ `POST /ai/interview-feedback` — consejos de `ai_skill_improvement` por skill
✔ `POST /ai/job-match` — compara `skills_required` de una oferta contra las skills del candidato (texto libre en el body, no lee `user_profiles` porque ese CRUD no existe aún)
✔ Fix: `ai_resume_guides` y `ai_skill_improvement` estaban vacías en la BD real (mismo tipo de fallo que `interview_types`), pobladas correctamente
✔ `POST /ai/ask` — endpoint conversacional: clasifica la intención de un mensaje libre por palabras clave, pide aclaración si falta info, rechaza fuera de tema (ver `docs/decisions.md`, entrada 014)
✔ Catálogo ampliado: `ai_resume_guides` 7→12 filas, `ai_skill_improvement` 12→20 filas
✔ Corregidos 3 typos de datos en `ai_resume_guides.industry` que hacían fallar el match exacto
✔ Tests manuales verificados (los 5 endpoints, casos válidos + validación + 404 + los 4 tipos de respuesta de `/ai/ask`)

**Importante:** no usa ningún LLM real — es un clasificador por palabras clave sobre las 3 tablas catálogo, decisión consultada explícitamente con el usuario (ver `docs/decisions.md`, entradas 010 y 014). Limitaciones conocidas: solo entiende frases esperadas en español, no genera texto libre, no detecta negación en `job-match`.
---
# Frontend
Estado general
🟢 Implementado (vanilla JS, sin framework, servido como estático desde el propio backend — ver `docs/decisions.md`, entrada 011). Este checklist reemplaza al anterior (Landing/Login/Dashboard/...), que no coincidía con las pantallas reales de `FRONTEND_DESIGN.md`.
---
## Login / Registro
🟢 (no estaba en `FRONTEND_DESIGN.md`, añadido por ser necesario para autenticación)
---
## 1. Home (resumen + accesos rápidos)
🟢 Evolucionada respecto al mockup original (que la preveía como estado vacío puro) por petición del usuario tras probar la app: ahora incluye resumen (postulaciones/entrevistas o ofertas publicadas, según rol) y accesos rápidos a las demás pantallas. Ver `docs/decisions.md`, entrada 013.
---
## 2. Formulario (perfil candidate)
🟢 — CV extendido (skills/experiencia) pendiente de `user_profiles`
---
## 2. Formulario (oferta company)
🟢 — adaptado a selector de empresa real + pills de selección única (ver decisión 011)
---
## 3/7. Listado de ofertas (candidate: postularse / company: gestionar)
🟢
---
## 4. Calendario semanal
🟢
---
## 5/6. Postulaciones (estado / notas, con toggle)
🟢
---
## 8. Asistente IA
🟢 Chat libre (sin pestañas de categoría): interpreta la pregunta por palabras clave, pide aclaración si le falta información, rechaza temas ajenos a HireFlow. Chips de sugerencia no vinculantes. Botones de icono con `title`/`alt` (nueva conversación, adjuntar archivo, enviar) usando los SVG de `frontend/assets/icons/`; adjuntar un archivo solo referencia su nombre en el mensaje (no se lee el contenido). Ver `docs/decisions.md`, entradas 014 y 015.
---
## Mascota animada global
🟢 Visible en todas las pantallas (montada una vez en `#mascot-root`, fuera del área que gestiona el router). Se mueve entre posiciones ancladas al viewport, da volteretas, se esconde parcialmente y muestra un bocadillo con frases de ayuda/humor (por rol, en los 4 idiomas). Clic → navega al Asistente IA.

**Limitación conocida:** no hace colisión real contra los elementos del DOM de cada pantalla (sería necesario remedir contenido dinámico constantemente); se apoya en posiciones fijas alejadas de la columna central de contenido, lo que funciona bien en escritorio/tablet y razonablemente en móvil. Ver `docs/decisions.md`, entrada 014.
---
## Internacionalización (i18n)
🟢 Español (por defecto), inglés, francés e italiano. Selector de idioma fijo en la topbar, persistido en `localStorage`, redibuja la pantalla actual al cambiar sin perder la navegación. Solo interfaz — los mensajes que devuelve la API se quedan en español (decisión consultada con el usuario). Las opciones de tipo de contrato/jornada/salario del formulario de ofertas guardan un código estable independiente del idioma, para que el mismo valor se muestre traducido sin importar en qué idioma se creó la oferta.

Decisión de arquitectura: ver `docs/decisions.md`, entrada 012.
---
## Responsive
🟢 Probado en tablet (768px), móvil (390px) y móvil pequeño (320px), en ambos roles: sin desbordamiento horizontal en ninguna pantalla, topbar adaptada (logo con tamaño fluido, iconos/selector más compactos por debajo de 480px), mascota global sin tapar contenido en ningún ancho. Ver `docs/decisions.md`, entrada 016.
---
# Testing
Backend
🟢 Postman
Frontend
🟢 Playwright (Chromium headless): flujo completo de candidate y recruiter probado end-to-end contra el servidor real — registro, login, CRUD de ofertas, postularse, cambiar estado, guardar nota, calendario, chat del Asistente IA. Sin errores de consola tras corregir los bugs encontrados (ver `docs/decisions.md`, entradas 011 y 014). Internacionalización probada en los 4 idiomas, incluida persistencia tras recargar y traducción correcta de valores guardados en distinto idioma al de creación (ver entrada 012). Asistente IA y mascota probados con los 4 tipos de respuesta, bug de contexto acumulado y bug de orientación del bocadillo detectados y corregidos durante las pruebas (ver entrada 014)
---
# Documentación
README
🟢
Architecture
🔴 Referenciado como `architecture.md` (ver `docs/decisions.md`), pero no existe en el repositorio (comprobado agosto 2026)
Roadmap
🔴 Referenciado como `roadmap.md` (ver `docs/api.md`), pero no existe en el repositorio (comprobado agosto 2026)
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
AI Instructions
🔴 Referenciado como `AI_INSTRUCTIONS.md` (la propia regla que `docs/decisions.md` y `docs/FRONTEND_DESIGN.md` citan como motivo de su existencia), pero no existe en el repositorio (comprobado agosto 2026)
Frontend Design
🟢 (creado agosto 2026, a partir de 9 capturas de Canva + descripción del usuario)
Sprint Plan (2 meses)
🔴 Referenciado como `SPRINT_PLAN_2MESES.md` — no existe en el repositorio
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
✔ Validaciones de entrada — completo
✔ CRUD Calendar — completo
✔ Módulo AI (basado en catálogo) — completo
✔ `docs/FRONTEND_DESIGN.md` creado a partir de capturas de Canva — completo
✔ Frontend implementado (vanilla JS) y probado en navegador — completo
✔ Internacionalización del frontend (es/en/fr/it) — completo
✔ Home con resumen + accesos rápidos (pedido tras pruebas manuales del usuario) — completo
✔ Asistente IA por chat libre (sin categorías, entiende lenguaje libre por reglas, pide aclaraciones) — completo
✔ Mascota animada global con bocadillo de frases — completo

**Backend y frontend cerrados, app multilingüe, con asistente conversacional y mascota.** Se completa todo lo previsto para el MVP y las mejoras pedidas tras las primeras pruebas manuales del usuario. Pendiente intencionalmente: CRUD de `user_profiles`, traducir los mensajes de la API, LLM real para el Asistente IA (se descartó explícitamente, ver `docs/decisions.md` entrada 014), y los documentos referenciados que nunca se crearon (`AI_INSTRUCTIONS.md`, `architecture.md`, `roadmap.md`, `SPRINT_PLAN_2MESES.md`).
---
# Objetivo MVP
Un usuario podrá:
✔ Registrarse
✔ Iniciar sesión
✔ Gestionar su perfil
✔ Buscar ofertas
✔ Guardarlas
✔ Cambiar su estado
🟡 Gestionar entrevistas (se pueden ver en el Calendario semanal; todavía no hay pantalla para crear/editar una entrevista directamente desde el frontend)
🟡 Ver estadísticas (resumen básico en Home desde v1.1.1: nº de postulaciones/ofertas y desglose por estado; no es un dashboard completo)
---
# Estado global
Backend
████████████████████ 100% (MVP completo: Users, Companies, Job Offers, Applications, Interviews, Calendar, AI conversacional, errores, validaciones)
Frontend
███████████████████░ 95% (8 pantallas + login implementadas, probadas y en 4 idiomas, Home con resumen y accesos rápidos, Asistente IA por chat, mascota animada; queda pendiente CRUD de user_profiles/CV extendido y crear entrevistas desde el frontend)
Base de datos
██████████████░░░ 75%
Documentación
█████████████░░░░░░░ 65% (Frontend Design creado; siguen sin existir AI Instructions, Architecture, Roadmap y Sprint Plan — ver tabla de arriba)
Proyecto completo
███████████████████░ 92% (backend y frontend funcionales, multilingües y con asistente conversacional para el MVP; quedan pulidos menores y documentación de proceso pendiente)