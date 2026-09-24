# HireFlow - CHANGELOG
Todas las modificaciones importantes del proyecto quedarán registradas aquí.
Formato basado en Keep a Changelog.

---

# [Sin publicar]

## Seguridad
- Eliminado `GET /users`: cualquier usuario con sesión iniciada podía listar el email y el teléfono de todos los usuarios, saltándose el consentimiento que se pide al postularse. Ninguna pantalla lo usaba. Borrados también `getUsers` (controller), `getAllUsers` (modelo) y la petición "Get Users" de la colección de Postman.
- Las empresas ahora tienen dueño (`companies.created_by_user`). Antes cualquier recruiter podía editar o borrar la empresa de otro (y al borrarla se perdían en cascada sus ofertas y las postulaciones de los candidatos), o publicar ofertas a nombre de otra empresa. Ahora solo el recruiter que creó la empresa puede editarla o borrarla, y solo puede publicar o mover ofertas a sus propias empresas.
- Ya no se puede borrar una empresa que tiene ofertas (409): hay que borrar antes las ofertas, para no eliminar postulaciones sin querer.
- El login ya no revela qué emails están registrados: devuelve siempre 401 "Email o contraseña incorrectos" (antes, 400 "Usuario no encontrado" o "contraseña incorrecta"), y tarda lo mismo exista o no el email.
- Límite de 10 intentos de login fallidos por IP cada 15 minutos (429), con `express-rate-limit`. Los logins correctos no cuentan.
- Cabeceras de seguridad con `helmet`: Content-Security-Policy (solo scripts propios; estilos y fuentes propios más Google Fonts), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, etc. Se quita `X-Powered-By: Express`.
- Contraseña al registrarse: de 8 a 72 caracteres, con al menos una letra y un número (antes, mínimo 6 y sin más reglas). No afecta al login de las cuentas ya creadas.
- `router.js` metía el mensaje de error de una pantalla en la página con `innerHTML`, así que si el mensaje llevaba HTML se interpretaba (riesgo de XSS). Ahora se crea con `el()` y se muestra como texto.

## Cambiado
- El formulario de oferta solo ofrece las empresas del propio recruiter.
- Los errores de login (401 y 429) se muestran traducidos en los 4 idiomas; antes salía el texto del backend, siempre en español.
- El mensaje de login correcto es "Sesión iniciada" en vez de "contraseña correcta".
- El formulario de registro avisa de las reglas de la contraseña antes de enviarlo, traducido en los 4 idiomas.

## Corregido
- "Postularme" dejaba la postulación en "Interesa" (`wishlist`) y sin fecha, aunque la empresa ya la recibía. Ahora entra como "Postulado" (`applied`) con la fecha del día.
- El candidato podía ponerse a sí mismo en "Oferta recibida" o "En entrevista", pisando lo que decidía la empresa. En las postulaciones a ofertas de HireFlow el estado ahora lo mueve solo la empresa (403 si el candidato lo intenta); el candidato puede retirar la postulación. Los seguimientos personales (sin oferta) siguen siendo libres.
- La empresa podía devolver a un candidato a "Interesa"; ya no (400).
- Guardar una nota borraba el aviso de "¡Actualizado por la empresa!". Ahora las notas y el estado se actualizan por separado (`PUT /applications/:id` es parcial).
- Agendar una entrevista no cambiaba el estado: la empresa tenía que ponerlo a mano. Ahora pasa a "En entrevista" automáticamente (si estaba en "Interesa" o "Postulado") y se avisa al candidato.
- En Postulantes, tras agendar una entrevista no se refrescaba la tarjeta; ahora se ve el estado nuevo.

## Añadido
- Botón "Retirar postulación" en Mis postulaciones, con un diálogo de confirmación propio (no el `confirm()` del navegador) que explica que la empresa dejará de verla.
- `aria-label` en los desplegables de estado (candidato y empresa).
- Favicon (`frontend/assets/icons/favicon.svg`): la "H" naranja del logo. Antes el navegador pedía `/favicon.ico` en cada carga y la consola mostraba un 404.

## Migración
- `backend/database/migrations/019_companies_created_by_user.sql` para bases existentes (añade la columna y asigna cada empresa al recruiter que publicó sus ofertas).

Detalle en `docs/decisions.md`, entradas 018 a 023.

---

# [1.3.0] - Agosto 2026 — Flujo de contratación completo: postulantes, consentimiento, entrevistas y política de privacidad

## Añadido
- Pantalla `/applicants` ("Postulantes", solo recruiter): quién se ha postulado a cada oferta propia, con perfil de contacto (email/teléfono) visible solo si el candidato dio su consentimiento al postularse, cambio de estado (avisa al candidato) y botón para agendar entrevista
- Modal de consentimiento + firma al postularse (`jobs.js`): checkbox obligatorio para compartir nombre/email/teléfono con la empresa, con aviso explícito de que nunca se piden datos bancarios ni sensibles, y campo de firma (nombre completo)
- La empresa puede agendar entrevistas directamente desde `/calendar` (botón "Añadir entrevista", solo recruiter) sobre cualquier postulación recibida en sus ofertas; el candidato las ve en su calendario como antes
- Aviso in-app de cambio de estado: tarjeta "Actualizaciones sin ver" en Home del candidato y etiqueta "¡Actualizado por la empresa!" en Mis postulaciones, hasta que el candidato abre esa pantalla
- Checkbox obligatorio de aceptación de la Política de Privacidad en el registro, con el texto completo (es/en) en un modal — ver `docs/decisions.md`, entrada 017, para el detalle legal y sus limitaciones
- `docs/googlePlayDataSafety.md`: borrador de las respuestas para la sección "Data Safety" de Google Play Console (no es una pantalla de la app — la rellena el publisher, no los usuarios)
- `autocomplete` en los campos de login/registro, perfil y formulario de oferta

## Corregido
- **Seguridad:** `PUT/DELETE /jobs/:id` no comprobaba que la oferta perteneciera al recruiter autenticado — cualquier empresa podía editar o borrar la oferta de otra. Ahora exige `created_by_user` además del rol.
- Mensajes de éxito que desaparecían en el mismo instante en que se mostraban (`calendar.js`, `applicants.js`) por refrescar la lista antes de mostrarlos
- Enlace a la política de privacidad anidado dentro del `<label>` del checkbox, lo que podía marcar la casilla sin querer en vez de abrir el diálogo
- `backend/database/shema.sql` estaba duplicado de arriba a abajo (habría roto una instalación limpia)

Detalle completo en `docs/decisions.md`, entrada 017.

---

# [1.2.2] - Agosto 2026 — Responsive: tablet, móvil y móvil pequeño

## Corregido
- Desbordamiento horizontal en (casi) todas las pantallas por debajo de ~480px de ancho, causado por la topbar (logo a tamaño fijo + icono de usuario + selector de idioma + botón de menú no cabían juntos) — logo con tamaño fluido (`clamp`), topbar más compacta en móvil, `overflow-x: hidden` como red de seguridad
- Variable CSS `--hf-beige-dark` usada pero nunca definida, dejaba sin efecto el `hover` de los botones de icono del asistente IA
- La mascota global (entrada 014) tapaba el texto introductorio de pantallas como Home en tablet/móvil, donde el contenido centrado ocupa casi todo el ancho — ya no usa las anclas junto al header por debajo de 1000px de ancho de viewport
- Etiqueta de estado y selector muy pegados en las tarjetas de "Mis postulaciones" en pantallas estrechas

Detalle completo, incluidos dos falsos positivos descartados (artefactos de temporización de las pruebas, no bugs reales), en `docs/decisions.md`, entrada 016.

---

# [1.2.1] - Agosto 2026 — Iconos SVG en el chat del asistente IA

## Añadido
- Botones de icono (con `title`/`alt` en los 4 idiomas) en la pantalla `/ai`, sustituyendo texto por los SVG ya preparados en `frontend/assets/icons/`: `añadir.svg` (nueva conversación / quitar adjunto), `adjuntar.svg` (abrir selector de archivo), `archivo.svg` (icono de la chip de adjunto), `enviar.svg` (enviar mensaje)
- Adjuntar un archivo muestra una "chip" con su nombre; al enviar, el nombre se añade entre corchetes al mensaje (el contenido del archivo no se lee ni se sube — el asistente sigue sin LLM)

## Corregido
- Colores de relleno casi invisibles (`#fcdf96`/`#fccc96`/`#fcb896`) en los 4 SVG recién integrados, mismo patrón ya corregido antes en `burger-menu.svg`

Detalle completo en `docs/decisions.md`, entrada 015.

---

# [1.2.0] - Agosto 2026 — Asistente IA por chat libre + mascota animada global

## Añadido
### Asistente IA
- `POST /ai/ask` — endpoint conversacional: clasifica la intención de un mensaje libre por palabras clave (`cv_review`, `interview_questions`, `interview_feedback`, `job_match`), pide una aclaración si falta información (industria, skill, oferta) en vez de fallar, y rechaza explícitamente cualquier tema no relacionado con HireFlow ("off_topic")
- `backend/models/aiAssistant.js` — clasificador de intención y extractores de industria/categoría/dificultad/skills/oferta por palabras clave (sin LLM, decisión consultada con el usuario)
- Pantalla `/ai` rediseñada como chat libre (sin pestañas de categoría): historial de mensajes, input de texto + Enter/botón enviar, 3 chips de pregunta de ejemplo no vinculantes, botón "Nueva conversación"
- Catálogo ampliado: `ai_resume_guides` 7→12 filas (+5 industrias), `ai_skill_improvement` 12→20 filas (+8 habilidades)

### Mascota animada global
- `frontend/js/mascot.js` + `frontend/style/mascot.css` — mascota (imagen ya preparada por el usuario en `frontend/assets/mascota-soporte.svg`) visible en todas las pantallas: se mueve entre posiciones ancladas al viewport, da volteretas, se esconde parcialmente y muestra un bocadillo con frases de ayuda/humor (por rol, en los 4 idiomas)
- Clic en la mascota navega al Asistente IA

## Corregido
- 3 typos de datos preexistentes en `ai_resume_guides.industry` (espacio inicial, coma final, ortografía) que hacían fallar el match exacto de `cv_review`
- Bug de contexto conversacional: el frontend reenviaba todo el historial acumulado en cada turno, así que una vez resuelto un tema, los mensajes siguientes seguían "arrastrándolo" y el clasificador no podía cambiar de tema — ahora el contexto solo se acumula mientras hay una aclaración pendiente
- Bug de posicionamiento del bocadillo de la mascota: se abría siempre hacia el mismo lado/borde y podía salirse de la pantalla cerca de las esquinas — ahora se orienta según la posición actual de la mascota

Detalle completo, alternativas consideradas y limitaciones conocidas (sin LLM real, sin multi-idioma en las respuestas del asistente, sin colisión real contra el DOM en la mascota) en `docs/decisions.md`, entrada 014.

---

# [1.1.1] - Agosto 2026 — Home: resumen + accesos rápidos

## Añadido
- Pantalla Home rediseñada: ya no es solo un texto de bienvenida — ahora incluye un resumen (postulaciones y próxima entrevista para candidate; ofertas publicadas para recruiter, con desglose por estado en el caso del candidate) y una cuadrícula de accesos rápidos a las demás pantallas, según rol
- `frontend/js/applicationStatus.js` — mapeo de estados de postulación a etiqueta traducida, extraído de `applications.js` para reutilizarlo también en Home

Cambio pedido por el usuario tras probar la app manualmente ("la pantalla de inicio se ve muy vacía"). Detalle y alternativas consideradas en `docs/decisions.md`, entrada 013.

---

# [1.1.0] - Agosto 2026 — Internacionalización del frontend (es/en/fr/it)

## Añadido
- `frontend/js/i18n.js` — diccionario de traducciones para español (por defecto), inglés, francés e italiano; función `t(key)` con fallback a español; idioma persistido en `localStorage`
- Selector de idioma fijo en la topbar, visible con o sin sesión iniciada
- `router.js` exporta `refresh()` para redibujar la pantalla actual (sin cambiar de ruta) al cambiar de idioma
- `frontend/js/jobOptions.js` — códigos estables (independientes del idioma) para las pills de tipo de contrato/jornada y salario del formulario de ofertas, con traducción solo de la etiqueta mostrada
- Traducidas las 8 pantallas + login/registro + menú de navegación

## Corregido
- `document.documentElement.lang` estaba fijo en `"en"` aunque el contenido por defecto era español

Detalle completo, incluido el problema de las pills con valor guardado dependiente del idioma y cómo se resolvió, en `docs/decisions.md`, entrada 012.

---

# [1.0.0] - Agosto 2026 — Implementación del frontend (vanilla JS)

## Añadido
- Frontend completo en vanilla JS (sin framework ni build step), servido como estático desde el propio `backend/server.js` (`express.static`) — mismo origen que `/api/*`, sin necesidad de configurar CORS
- Módulos base: `api.js` (fetch + JWT desde `localStorage`), `auth.js`, `router.js` (hash router con parámetros de ruta), `components/ui.js`, `components/cardGrid.js`, `components/header.js` (menú dinámico según rol)
- Pantalla de Login/Registro (no estaba en `FRONTEND_DESIGN.md`, necesaria para autenticación)
- Las 8 pantallas de `FRONTEND_DESIGN.md`: Home/Empty State, Formulario (perfil candidate / oferta company), listado de ofertas (candidate + company, con crear/editar/eliminar/postularse), postulaciones con toggle estado/notas, Calendario semanal de entrevistas, Asistente IA (panel de 4 funciones sobre los endpoints de IA existentes)
- `frontend/style/components.css` con los estilos de todos los componentes nuevos, sobre la paleta ya definida en `docs/FRONTEND_DESIGN.md`

## Corregido (bugs detectados probando en navegador con Playwright)
- `header.js` importaba `getCurrentUser` de un módulo que no lo exportaba — rompía la carga completa de la app
- Los iconos SVG del header se renderizaban a 0×0 píxeles (sin `width`/`height` ni en el SVG ni en CSS) — completamente invisibles
- `burger-menu.svg` usaba un color de relleno casi invisible sobre fondo blanco — corregido a negro
- El formulario de login no centraba verticalmente su contenido (`flex-direction` faltante) — el enlace "Regístrate" flotaba al lado del formulario en vez de debajo

## Adaptado respecto al mockup (documentado en `docs/decisions.md`, entrada 011)
- Selector de empresa existente + creación rápida en vez de campos de texto libre (`job_offers.company_id` es una FK real)
- Pills de tipo de contrato/jornada/salario como selección única, no checkboxes (columnas de texto simples en la BD)
- Campo "Urgencia" solo visual, no se persiste (no existe columna en `job_offers`)
- Asistente IA como formularios estructurados por función, no chat libre — queda pendiente a propósito, tal como pidió el usuario

Detalle completo, alternativas consideradas y verificación en `docs/decisions.md`, entrada 011.

---

# [0.9.1] - Agosto 2026 — Documentación de diseño de frontend

## Añadido
- Creado `docs/FRONTEND_DESIGN.md` a partir de 9 capturas de Canva y la descripción del usuario: principio de diseño (una interfaz para ambos roles), paleta/estilo visual observado, layout base, inventario de 8 pantallas (objetivo, flujo, componentes, datos, endpoints por pantalla), mapa de componentes y pendientes de definir antes de implementar

## Documentado (hallazgos, sin corregir en este cambio)
- `AI_INSTRUCTIONS.md`, `architecture.md`, `roadmap.md` y `SPRINT_PLAN_2MESES.md` están referenciados en varios documentos del proyecto pero **no existen en el repositorio** (`projectStatus.md` los tenía marcados como 🟢 completados incorrectamente, corregido a 🔴)
- Pendientes detectados al mapear el diseño de frontend contra el backend real: CRUD de `user_profiles` (no existe), columna `urgency` en `job_offers` (no existe en el schema), endpoint de "candidatos que encajan con una oferta" (no existe), y decisión pendiente sobre si el Asistente IA (pantalla 8) se queda como consulta de catálogo o se amplía a un LLM real con conversación libre

---

# [0.9.0] - Agosto 2026 — Módulo AI (basado en catálogo) — backend del MVP cerrado

## Añadido
### AI
- `POST /ai/cv-review` — recomendaciones de `ai_resume_guides` por `industry`/`company_type`, con fallback a guías genéricas
- `POST /ai/interview-questions` — preguntas de `ai_interview_questions` filtradas por `category`/`difficulty`, selección aleatoria con `limit`
- `POST /ai/interview-feedback` — consejos de `ai_skill_improvement` para una lista de `skills`
- `POST /ai/job-match` — compara `skills_required` de una oferta contra las `skills` enviadas por el candidato (solapamiento de palabras), sugiere mejoras para las que faltan

**Importante:** ninguno de los 4 endpoints llama a un LLM externo — son consultas sobre las 3 tablas catálogo ya existentes en el schema. Detalle y limitaciones conocidas en `docs/decisions.md`, entrada 010.

## Corregido
- `database/seed.sql`: `ai_resume_guides` y `ai_skill_improvement` estaban vacías en la BD real por el mismo tipo de fallo de división de sentencias que afectó a `interview_types` (punto y coma dentro del propio texto de las descripciones). Pobladas correctamente: `ai_resume_guides` 0→7 filas, `ai_skill_improvement` 0→12 filas

Con este cambio se completa el backend previsto para el MVP.

---

# [0.8.0] - Agosto 2026 — CRUD Calendar

## Añadido
### Calendar
- `GET /calendar` — listar eventos del usuario autenticado
- `GET /calendar/:id` — obtener un evento propio
- `POST /calendar` — crear evento propio (`title` obligatorio, `related_application` opcional)
- `PUT /calendar/:id` — actualizar evento propio, solo campos enviados
- `DELETE /calendar/:id` — eliminar evento propio
- `related_application` (FK opcional hacia `applications`) se valida por propiedad, no solo por existencia — reutiliza `getApplicationById` para impedir enlazar un evento a una `application` de otro usuario (ver `docs/decisions.md`, entrada 009)

Detalle y alternativas consideradas en `docs/decisions.md`, entrada 009.

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

# Próxima versión (1.3.0)
Objetivos:
- CRUD de `user_profiles` (CV extendido del candidate)
- Cambio de contraseña (`PUT /users/me/password`), rol `admin`
- Seguir ampliando el contenido de las tablas catálogo de AI
- Revisar el color de los iconos SVG restantes (`adjuntar`, `archivo`, `añadir`, `enviar`) si se conectan a alguna pantalla — comparten el mismo problema de color pálido corregido en `burger-menu.svg`
- Si en algún momento se decide dar el salto a un LLM real para el Asistente IA (ver `docs/decisions.md`, entrada 014), habría que reconsiderar el idioma de las respuestas del asistente (hoy solo en español)
- Ampliar `frontend/js/i18n.js` a más idiomas si hace falta, o traducir también los mensajes que devuelve la API (fuera de alcance por decisión, ver `docs/decisions.md` entrada 012)