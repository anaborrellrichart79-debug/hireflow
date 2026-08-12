# HireFlow - Registro de Decisiones Técnicas

Este documento registra las decisiones importantes tomadas durante el desarrollo, según exige `AI_INSTRUCTIONS.md`:

> "Cuando exista una decisión importante deberá registrarse en docs/decisions.md, explicando: Problema, Alternativas, Decisión, Motivo."

Orden cronológico, más reciente al final.

---

## 001 — Corregir vulnerabilidad IDOR en Applications
**Fecha:** Agosto 2026

**Problema:**
Los endpoints `GET /applications/:id`, `PUT /applications/:id` y `DELETE /applications/:id` no comprobaban que la postulación perteneciera al usuario autenticado. Las funciones del modelo (`getApplicationById`, `updateApplication`, `deleteApplication`) filtraban únicamente por `id`, sin cruzar con `user_id`. Cualquier usuario logueado podía leer, modificar o eliminar postulaciones de otros usuarios probando IDs consecutivos (vulnerabilidad tipo IDOR — Insecure Direct Object Reference).

**Alternativas consideradas:**
- (a) Añadir una comprobación en el controller (`if (application.user_id !== req.user.id) return res.status(403)...`) después de recuperar el registro completo.
- (b) Filtrar directamente en la query SQL por `id` **y** `user_id` a la vez.

**Decisión:** (b) — filtrar en la query SQL.

**Motivo:**
- Evita una consulta innecesaria a la BD cuando el registro no pertenece al usuario (con (a) primero se lee, luego se descarta).
- Es más difícil de olvidar en futuros endpoints: el propio modelo obliga a pasar `userId`, no depende de que cada controller recuerde añadir la comprobación.
- Devuelve 404 en vez de 403 cuando el recurso no es del usuario — no revela si el ID existe o no, lo cual es preferible desde el punto de vista de seguridad (no dar pistas a quien intenta enumerar IDs ajenos).

**Archivos afectados:** `models/application.js`, `controllers/applicationControllers.js`

**Nota:** este mismo patrón (filtrar por `id` + `user_id`/`company_id` en la query, no solo por `id`) debe aplicarse desde el inicio en Companies, Jobs e Interviews cuando se implementen, para no repetir el mismo fallo.

---

## 002 — Usar `/users/me` en vez de `/users/:id` para operaciones sobre el propio perfil
**Fecha:** Agosto 2026

**Problema:**
Al implementar `updateUser`, `deleteUser` y `getProfile`, había que decidir el patrón de ruta: `/users/:id` (donde `:id` se compara contra `req.user.id`) o `/users/me` (sin parámetro, siempre referido al usuario del token).

**Alternativas consideradas:**
- (a) `/users/:id`, comprobando en el controller que `req.params.id === req.user.id`.
- (b) `/users/me`, sin parámetro — el controller usa directamente `req.user.id`, ignorando cualquier otro valor.

**Decisión:** (b) — `/users/me`.

**Motivo:**
Justo acabamos de corregir una vulnerabilidad IDOR en Applications causada por olvidar comprobar la propiedad del recurso en una query. Con `/users/:id` existe el mismo riesgo: basta con que alguien olvide la comprobación en un futuro cambio para reabrir el mismo fallo. Con `/users/me`, el propio diseño de la ruta hace imposible pedir el perfil de otro usuario — no hay `:id` que se pueda manipular. Es "seguro por diseño" en vez de "seguro porque el código lo comprueba correctamente".

**Nota:** si en el futuro se necesita que un `admin` gestione perfiles de otros usuarios, se añadirá una ruta **separada** `PUT /users/:id` protegida con `roleMiddleware(['admin'])`, sin tocar `/users/me`.

---

## 003 — Permisos de Companies: lectura autenticada, escritura solo `recruiter`
**Fecha:** Agosto 2026

**Problema:**
La tabla `companies` no tiene columna de propietario (`user_id`/`created_by`), a diferencia de `applications`, así que el fix de IDOR (entrada 001) no aplica directamente aquí — no hay un dueño individual del recurso contra el que filtrar. Había que decidir de todos modos quién puede leer y quién puede escribir (crear/editar/eliminar) empresas.

**Alternativas consideradas:**
- (a) Todo público, sin token.
- (b) Lectura y escritura abiertas a cualquier usuario autenticado (mismo criterio que Applications).
- (c) Lectura para cualquier usuario autenticado; escritura (`POST`/`PUT`/`DELETE`) restringida a usuarios con `role = 'recruiter'`.

**Decisión:** (c).

**Motivo:**
Las empresas son un recurso compartido, no privado de un usuario — tiene sentido que cualquier candidato autenticado pueda verlas (para postular a sus ofertas), pero solo los reclutadores deberían poder crearlas o modificarlas. Esto introduce el primer control de acceso basado en rol del proyecto: se crea `middleware/roleMiddleware.js` (`requireRole(allowedRoles)`), que se usa siempre después de `verifyToken` porque depende de `req.user.role` (viene del JWT). Este middleware queda listo para reutilizarse en Job Offers y, más adelante, en rutas de `admin`.

**Archivos afectados:** `middleware/roleMiddleware.js` (nuevo), `models/company.js` (nuevo), `controllers/companyControllers.js` (nuevo), `routes/companyRoutes.js` (nuevo), `server.js`.

---

## 004 — Job Offers: mismo modelo de permisos que Companies, `created_by_user` fijado por servidor
**Fecha:** Agosto 2026

**Problema:**
Al implementar `job_offers` había dos decisiones pendientes: (1) qué permisos aplican, igual que en Companies; (2) cómo se rellena `created_by_user` — si lo envía el cliente en el body o lo fija el servidor.

**Alternativas consideradas (permisos):**
- Mismas tres alternativas que en la entrada 003 (público / cualquier autenticado / solo `recruiter` para escritura).

**Decisión (permisos):** igual que Companies — lectura para cualquier usuario autenticado, escritura (`POST`/`PUT`/`DELETE`) solo `role = 'recruiter'`, reutilizando `requireRole` sin cambios.

**Motivo:** no existe una tabla que vincule un `recruiter` a una `company` concreta, así que — igual que con Companies — cualquier recruiter puede gestionar ofertas de cualquier empresa por ahora. Esto es intencional y coherente con la nota ya existente en `database.md` sobre `job_offers`: "varios usuarios de la misma empresa pueden publicar ofertas". Restringir por `created_by_user` habría roto ese caso de uso.

**Alternativas consideradas (`created_by_user`):**
- (a) Aceptar `created_by_user` del body enviado por el cliente.
- (b) Ignorar cualquier `created_by_user` del body y fijarlo siempre a `req.user.id` (el usuario del token).

**Decisión:** (b).

**Motivo:** mismo criterio que `user_id` en Applications (entrada 001) — no confiar en datos de autoría que vengan del cliente. En el controller, `created_by_user` se añade *después* de hacer spread de `req.body`, así que cualquier valor que el cliente intente colar para ese campo queda sobrescrito. Por el mismo motivo, `updateJobOffer` excluye `created_by_user` de los campos actualizables: no se reasigna la autoría de una oferta desde un `PUT`.

**Archivos afectados:** `models/jobOffer.js` (nuevo), `controllers/jobOfferControllers.js` (nuevo), `routes/jobOfferRoutes.js` (nuevo), `server.js`.

---

## 005 — Interviews: propiedad heredada de Applications, filtrado por JOIN en la propia query
**Fecha:** Agosto 2026

**Problema:**
La tabla `interviews` no tiene columna `user_id` propia — su dueño real es el usuario de la `application` a la que pertenece (`interviews.application_id → applications.user_id`). A diferencia de Companies y Job Offers (entradas 003 y 004, sin dueño individual), aquí sí aplica directamente el fallo de IDOR ya corregido en Applications (entrada 001), y la propia nota de la entrada 001 señalaba que este patrón debía aplicarse "desde el inicio" en Interviews.

**Alternativas consideradas:**
- (a) Leer la entrevista solo por `id`, comprobar en el controller si `application.user_id === req.user.id` después de recuperar el registro (y su `application` asociada con una segunda consulta).
- (b) Filtrar siempre por `id` **y** propiedad en una sola query SQL, usando `JOIN applications` para cruzar contra `user_id`, igual que se hizo en Applications.

**Decisión:** (b).

**Motivo:** mismo motivo que la entrada 001 — evita una consulta de más cuando el registro no es del usuario, y hace imposible que un futuro endpoint olvide la comprobación de propiedad, porque está incrustada en la query, no en un `if` aparte. Se aplica en las cuatro operaciones:
- `getInterviewById` / `getInterviewsByUser`: `SELECT ... FROM interviews i JOIN applications a ON i.application_id = a.id WHERE a.user_id = ?`
- `updateInterview` / `deleteInterview`: `UPDATE`/`DELETE` con el mismo `JOIN` en la cláusula `WHERE`.
- `createInterview`: en vez de un `INSERT ... VALUES` simple, se usa `INSERT INTO interviews (...) SELECT ... FROM applications WHERE id = ? AND user_id = ?` — si la `application_id` indicada no pertenece al usuario autenticado, la subconsulta no devuelve filas y no se inserta nada (`affectedRows = 0`), sin necesidad de una comprobación previa por separado.

Igual que con Applications, se devuelve 404 ("Entrevista no encontrada" / "Postulación no encontrada" en creación) tanto si el ID no existe como si pertenece a otro usuario, nunca 403 — no se revela la existencia de entrevistas ajenas.

**Archivos afectados:** `models/interview.js` (nuevo), `controllers/interviewControllers.js` (nuevo), `routes/interviewRoutes.js` (nuevo), `server.js`.

---

## 006 — Corrección de dos bugs detectados durante el CRUD de Interviews
**Fecha:** Agosto 2026

**Problema 1:** `createApplication` (`models/application.js`) desestructuraba `job_offer_id` y `notes` de `applicationData` sin valor por defecto. Si el cliente los omitía del body (en vez de enviarlos explícitamente como `null`), llegaban como `undefined` a `db.execute`, y mysql2 lanza `Bind parameters must not contain undefined` — el endpoint `POST /applications` devolvía 500 en un caso de uso perfectamente válido (crear una postulación sin nota ni oferta asociada todavía).

**Decisión:** añadir `= null` como valor por defecto en la desestructuración de ambos campos, igual que ya se hizo desde el principio en los modelos nuevos (`company.js`, `jobOffer.js`, `interview.js`) para evitar este mismo problema.

**Archivos afectados:** `models/application.js`.

---

**Problema 2:** `database/seed.sql` insertaba en `interview_types` usando columnas `name`/`description`, que no existen en el esquema real (`name_interview_types` ENUM en inglés + `description_interview_types`). Además, los valores que insertaba eran texto libre en español ("Estructurada", "Panel", "Dinámica de grupo"...), incompatibles con el ENUM. Ese `INSERT` nunca pudo haber funcionado, y la tabla estaba vacía en la BD real — cualquier prueba con `interview_type_id` fallaba por falta de datos de catálogo.

**Decisión:** corregir el `INSERT` para usar los nombres de columna reales y mapear cada categoría en español al valor de ENUM más cercano, conservando la descripción original en español en `description_interview_types` (y añadiendo una aclaración entre paréntesis cuando el nombre en español se pierde al mapear, p. ej. "Panel" y "Dinámica de grupo" mapean ambos a `group_dynamics`, y "caso" no tiene equivalente exacto en el ENUM así que se mapeó a `technique` con nota aclaratoria). Se ejecutó el `INSERT` corregido contra la BD real: `interview_types` pasó de 0 a 14 filas.

**Archivos afectados:** `database/seed.sql`, BD real (poblada manualmente con el `INSERT` corregido).

---

## 007 — Middleware de errores centralizado
**Fecha:** Agosto 2026

**Problema:**
Cada función de cada controller (25 en total, entre Users, Applications, Companies, Job Offers e Interviews) repetía el mismo patrón: `try { ... } catch (error) { console.log(...); res.status(500).json({message: "Error al ..."}) }`, con pequeñas variaciones. Además, en varios sitios (`applicationControllers.js`, `companyControllers.js` originalmente) el `catch` genérico devolvía `error.message` o incluso el objeto `error` completo al cliente, filtrando potencialmente detalles internos del driver de MySQL.

**Alternativas consideradas:**
- (a) Dejar cada controller con su propio `try/catch`, solo añadiendo un `errorHandler` final de Express para las rutas no cubiertas (mínimo cambio).
- (b) Eliminar el `try/catch` de cada función controller, envolver cada handler de las rutas con un `asyncHandler(fn)` que reenvía cualquier error a `next(error)`, y centralizar el formateo de la respuesta de error en un único `middleware/errorMiddleware.js`. Mantener `try/catch` local únicamente donde el mensaje de error debe ser específico del recurso (email duplicado, FK inválida con nombre de campo concreto), relanzando (`throw error`) en cualquier otro caso para que llegue al handler centralizado.
- (c) Igual que (b) pero además centralizando también los mensajes específicos de duplicado/FK (perdiendo el detalle de "email de la empresa" vs. "email de usuario", por ejemplo).

**Decisión:** (b).

**Motivo:**
- Elimina la duplicación de las ~20 funciones que no necesitaban ningún tratamiento especial de errores (paso directo a 500 genérico).
- Mejora la seguridad: el handler centralizado (`middleware/errorMiddleware.js`) solo devuelve `error.message` al cliente cuando el propio código fijó explícitamente un `status < 500` (un error "esperado", con mensaje seguro de mostrar); cualquier error no controlado (`status` ausente o ≥ 500) responde siempre con el mensaje genérico `"Error interno del servidor"`, nunca con el texto crudo del driver de MySQL ni una traza — el detalle completo solo se registra en el log del servidor vía `console.error`. Esto corrige la fuga de información que ya existía en `createNewApplication` (devolvía `error.message` y el objeto `error` completo) y en la rama `catch` genérica de `createNewCompany`/`createNewJobOffer`/`createNewInterview`.
- Se conserva (c) descartada porque los mensajes específicos por recurso ("El email de la empresa ya está registrado", "La empresa indicada (company_id) no existe", "El tipo de entrevista indicado (interview_type_id) no existe") son más claros para quien consume la API que un genérico "referencia inválida" — se mantienen como `try/catch` locales que relanzan (`throw error`) cuando el error no es el que esperaban, dejando que el handler centralizado se ocupe del resto.
- Se añade también `notFound` (404 para cualquier ruta no definida) y se corrige de paso un bug latente: una petición malformada (ej. `POST /users/login` sin body) podía no estar cubierta por ningún `try/catch` y habría tumbado el proceso Node por una excepción no capturada; ahora cualquier error de cualquier controller, capturado o no, termina siempre en una respuesta HTTP bien formada.

**Archivos afectados:** `middleware/asyncHandler.js` (nuevo), `middleware/errorMiddleware.js` (nuevo), los 5 controllers (`userControllers.js`, `applicationControllers.js`, `companyControllers.js`, `jobOfferControllers.js`, `interviewControllers.js`, simplificados), las 5 rutas (handlers envueltos en `asyncHandler`), `server.js` (registro de `notFound` + `errorHandler` al final, después de todas las rutas).

---

## 008 — Validaciones de entrada con `express-validator`
**Fecha:** Agosto 2026

**Problema:**
Ningún endpoint validaba el `body` antes de llegar al modelo. Los únicos "guardarraíles" existentes eran las constraints de la propia base de datos (`NOT NULL`, `UNIQUE`, `FOREIGN KEY`, `ENUM`), lo que producía errores poco claros (500 genéricos, o el error crudo de mysql2 antes de la entrada 007) ante datos mal formados, y en el caso de `PUT /applications/:id` un bug real: `updateApplication` sobreescribe siempre `status` y `notes` sin comprobar que vengan en el body, así que omitir `status` producía `Bind parameters must not contain undefined` (el mismo tipo de fallo que la entrada 006, no detectado hasta ahora porque nadie había probado ese caso).

**Alternativas consideradas:**
- (a) Validación manual: un `middleware/validators.js` propio con funciones tipo `isValidEmail`, sin dependencias nuevas.
- (b) `express-validator`: librería estándar de validación para Express, se define un array de validadores por ruta (`body("email").isEmail()...`) más un middleware genérico que corta con 400 si falla alguno.

**Decisión:** (b), consultado con el usuario dado que suponía añadir la primera dependencia de validación al proyecto.

**Motivo:** menos código repetido por endpoint que escribir cada comprobación a mano, mensajes de error consistentes y estructurados (`{message, errors: [{field, message}]}`), y es la opción más estándar dentro del ecosistema Express — encaja con `validators/` como carpeta ya prevista desde el principio del proyecto (ver `CHANGELOG.md`, v0.1.0, "Nueva estructura: constants/ services/ validators/ utils/") aunque nunca se había creado hasta ahora.

**Diseño:**
- `middleware/validate.js`: middleware genérico que ejecuta `validationResult(req)` y devuelve 400 si hay errores; se coloca siempre después del array de validadores y antes de `asyncHandler(controller)` en cada ruta.
- Un archivo de validadores por recurso en `validators/` (`userValidators.js`, `companyValidators.js`, `jobOfferValidators.js`, `applicationValidators.js`, `interviewValidators.js`), con un array de creación y otro de actualización por recurso.
- Los límites de longitud de los validadores (`isLength({max: ...})`) reflejan los tamaños reales de columna en `shema.sql` (p. ej. `name` de `companies` es `varchar(150)`), para devolver un 400 claro en vez de dejar que MySQL trunque o rechace el dato.
- `scheduled_date` de Interviews no usa `isISO8601()` (que exige separador `T`) sino una regex propia que acepta tanto `YYYY-MM-DD HH:mm:ss` (formato nativo de MySQL DATETIME, el que ya usaba toda la documentación y las pruebas manuales) como la variante con `T`.
- **`PUT /applications/:id` ahora exige `status` obligatorio** (uno de los 5 valores del ENUM) precisamente porque el modelo no hace update parcial — esto convierte el bug de bind `undefined` en un 400 claro en vez de un crash. De paso se añadió `notes = null` como valor por defecto en `updateApplication` (`models/application.js`) para que omitir `notes` (que sí es opcional) tampoco produzca el mismo error.

**Archivos afectados:** `middleware/validate.js` (nuevo), `validators/*.js` (5 archivos nuevos), las 5 rutas (validadores añadidos antes de `asyncHandler`), `models/application.js` (`notes = null` por defecto en `updateApplication`), `package.json` (nueva dependencia `express-validator`).

---

## 009 — CRUD Calendar: `related_application` validado por propiedad, no solo por FK
**Fecha:** Agosto 2026

**Problema:**
`calendar_events` tiene `user_id` propio (FK directa, igual que Applications) — el patrón de propiedad aquí es simple. Pero también tiene `related_application`, una FK **opcional** hacia `applications(id)`. Si se deja que solo la constraint de la BD valide ese campo (como se hizo con `company_id` en Job Offers o `interview_type_id` en Interviews), un usuario podría enlazar su propio evento de calendario al `id` de una `application` de otro usuario, simplemente probando IDs — no expondría los datos de esa `application` ajena (no hay ningún `JOIN` que los devuelva), pero sí permitiría una referencia cruzada indebida y confirmar por fuerza bruta qué IDs de `application` existen.

**Alternativas consideradas:**
- (a) Dejar que la FK de la BD valide solo existencia (mismo patrón que `company_id` en Job Offers), sin comprobar propiedad.
- (b) Cuando se envía `related_application`, comprobar explícitamente que esa `application` pertenece al usuario autenticado antes de crear o actualizar el evento, reutilizando `getApplicationById(id, userId)` (ya existe en `models/application.js` y ya filtra por `id` + `user_id`).

**Decisión:** (b).

**Motivo:** coherente con el criterio general del proyecto (entradas 001 y 005) de no confiar únicamente en la existencia de un ID ajeno como comprobación de acceso. A diferencia de `company_id` en Job Offers (donde cualquier `recruiter` puede referenciar cualquier `company`, por diseño — entrada 004), aquí `related_application` sí tiene un dueño individual real, así que el mismo criterio de "un usuario no debe poder referenciar sin permiso un recurso que no es suyo" aplica. La comprobación se hace en el **controller** (`controllers/calendarControllers.js`, función `isRelatedApplicationOwnedByUser`), no en el modelo, para poder reutilizar `getApplicationById` tal cual sin duplicar SQL; se ejecuta antes del `INSERT`/`UPDATE` porque `related_application` es opcional y solo aplica cuando se envía (a diferencia de Interviews, donde `application_id` es obligatorio y por eso ahí sí compensa resolverlo en una sola query `INSERT ... SELECT`).

**Archivos afectados:** `models/calendarEvent.js` (nuevo), `controllers/calendarControllers.js` (nuevo), `validators/calendarEventValidators.js` (nuevo), `routes/calendarRoutes.js` (nuevo), `server.js`.

---

## 010 — Módulo AI: consultas sobre catálogo, sin LLM real
**Fecha:** Agosto 2026

**Problema:**
`api.md` preveía 4 endpoints de IA (`cv-review`, `interview-feedback`, `interview-questions`, `job-match`) sin especificar su implementación. El proyecto no tiene ninguna API key de LLM configurada en `.env`, y las 3 tablas catálogo (`ai_interview_questions`, `ai_resume_guides`, `ai_skill_improvement`) ya existían en el schema pero solo `ai_interview_questions` tenía datos (sembrada por accidente al corregir `interview_types`, ver entrada 006) — `ai_resume_guides` y `ai_skill_improvement` estaban vacías por el mismo motivo: el `seed.sql` original se dividía mal en sentencias por culpa de puntos y coma dentro del propio texto de las descripciones (p. ej. "No resumas tanto; en este sector...").

**Decisión (consultada y aprobada con el usuario):** los 4 endpoints son consultas sobre las 3 tablas catálogo, sin llamar a ningún LLM externo:
- `cv-review` → `ai_resume_guides`, filtrando por `industry` (+ `company_type` opcional); si no hay coincidencia exacta, cae a las guías genéricas (`industry = 'none'`).
- `interview-questions` → `ai_interview_questions`, filtrando por `category`/`difficulty` opcionales, selección aleatoria (`ORDER BY RAND()`) limitada por `limit` (1-50, por defecto 10).
- `interview-feedback` → `ai_skill_improvement`, buscando por una lista de `skills` (array de texto) enviada en el body, con `LIKE` sobre `skill_name`.
- `job-match` → compara `job_offers.skills_required` (texto libre) contra las `skills` que envía el candidato en el body, tokenizando ambos textos y calculando un porcentaje de solapamiento; las skills que faltan se cruzan con `ai_skill_improvement` para sugerir mejoras.

**Desviación respecto a la propuesta original — `job-match` no lee de `user_profiles`:** la propuesta inicial planteaba comparar contra `user_profiles.skills` (perfil guardado del candidato), pero `user_profiles` no tiene ningún modelo ni endpoint implementado todavía (tabla existe en el schema, cero código backend) — construir ese acceso de lectura solo para este endpoint habría sido una implementación parcial e inconsistente de un recurso que no se ha diseñado como tal. En su lugar, `job-match` recibe las `skills` directamente en el body de la petición. Cuando se implemente el CRUD de `user_profiles`, este endpoint puede pasar a leerlas de ahí en vez de exigirlas en el body — no es un cambio de contrato grave (se podría aceptar `skills` opcional en el body y usarlo solo si no hay perfil guardado).

**Limitación conocida y aceptada:** el matching de `job-match` es solapamiento de palabras (tokeniza y compara conjuntos), sin analizar negación ni contexto — si el candidato escribe "no tengo experiencia en Docker", la palabra "docker" igualmente cuenta como match. Es una limitación explícita de un cálculo local sin IA real, aceptada porque el propio usuario planteó esta primera versión como una base a ampliar más adelante ("ahora unas cuantas [respuestas] y luego, después del frontend, la ampliamos").

**Motivo general:** confirma en código lo que ya sugería el propio schema (tablas catálogo, no tablas de sesiones/prompts/respuestas de un LLM): la "IA" de este proyecto, en esta fase, es una capa de recomendaciones basada en contenido curado a mano en la BD, no generación de texto en tiempo real. Es coherente con el enfoque general del proyecto hasta ahora (sin dependencias de servicios externos de pago).

**Archivos afectados:** `models/ai.js` (nuevo), `controllers/aiControllers.js` (nuevo), `validators/aiValidators.js` (nuevo), `routes/aiRoutes.js` (nuevo), `server.js`, `database/seed.sql` (poblada correctamente en la BD real: `ai_resume_guides` 0→7 filas, `ai_skill_improvement` 0→12 filas).

---

## 011 — Implementación del frontend: vanilla JS servido desde el propio Express, sin framework
**Fecha:** Agosto 2026

**Problema:**
`docs/FRONTEND_DESIGN.md` ya documentaba las 8 pantallas, pero faltaba decidir cómo construirlas: el proyecto ya tenía un scaffold empezado (`frontend/index.html` + CSS plano, sin ningún framework ni build tool) con el `Header` parcialmente hecho. Había que decidir si continuar en ese mismo estilo o introducir React/Vue + un bundler, y cómo conectar el frontend con la API sin toparse con CORS (el backend no tenía `cors` configurado).

**Alternativas consideradas:**
- (a) Introducir un framework (React/Vue) con su propio dev server (Vite, etc.), y añadir el paquete `cors` en el backend para permitir peticiones cross-origin entre ambos servidores.
- (b) Continuar en vanilla JS (como ya estaba empezado el `Header`), con un router propio muy simple basado en el hash de la URL, y servir el frontend como archivos estáticos desde el mismo servidor Express que ya sirve `/api/*` — mismo origen, sin necesidad de CORS.

**Decisión:** (b).

**Motivo:**
- Seguir el estilo ya iniciado en el repo (`index.html`/`layaut.css`/`main.css` ya existían, sin ninguna dependencia de frontend) en vez de descartarlo por un framework nuevo.
- Evita añadir `cors` y toda la superficie de configuración que conlleva (orígenes permitidos, credenciales, preflight) — al servir el frontend desde `app.use(express.static(...))` en el propio `server.js`, el navegador nunca trata las peticiones a `/api/*` como cross-origin.
- El routing de pantallas es 100% client-side (hash, `#/jobs`, `#/applications`, etc.), así que no hace falta ningún fallback especial en el servidor para rutas desconocidas — Express solo necesita servir `index.html` en `/` y los assets estáticos; el hash nunca llega al servidor.

**Arquitectura resultante (`frontend/js/`):**
- `api.js` — wrapper de `fetch` a `/api/*`, añade el JWT desde `localStorage`, decodifica el payload del token en cliente para saber `id`/`email`/`role` sin llamar a `GET /users/me`.
- `auth.js` — `login`/`register`/`logout`/`isAuthenticated`.
- `router.js` — router hash propio con soporte de parámetros de ruta (`/jobs/edit/:id`), guarda de autenticación (redirige a `/login` si la ruta no es pública y no hay sesión).
- `components/` — `ui.js` (helper `el()` para crear elementos sin plantillas de string, evita problemas de escapado con datos de la API), `header.js` (menú hamburguesa dinámico según rol), `cardGrid.js`.
- `screens/` — una función `render(container, params)` por pantalla.

**Pantalla de Login/Registro añadida (no estaba en `FRONTEND_DESIGN.md`):** las 8 pantallas del diseño asumen sesión iniciada; hacía falta una pantalla de entrada. Se añadió con el mismo lenguaje visual (tarjeta con degradado, botón píldora) pero es una adición de esta implementación, no parte del diseño aprobado en Canva.

**Adaptaciones respecto al diseño original (mockup orientativo, ver nota en `FRONTEND_DESIGN.md`):**
- El Formulario de oferta laboral (pantalla 2) sustituye los campos de texto libre "Nombre de la empresa"/"Información de la empresa" por un selector de empresa existente (`GET /companies`) + creación rápida inline — porque `job_offers.company_id` es una FK real, no texto libre.
- Los grupos de pills de "Tipo de contrato"/"Tipo de jornada"/"Salario" se implementan como selección única (tipo radio), no checkboxes multi-selección — porque `employment_type` y `salary` son columnas de texto simples en `job_offers`, no relaciones de valores múltiples.
- El campo "Urgencia" (escala 1-5) se mantiene en el formulario por fidelidad visual al mockup, pero no se envía al backend — `job_offers` no tiene ninguna columna para persistirlo (ver pendientes ya anotados en `FRONTEND_DESIGN.md`).
- La pantalla 8 (Asistente IA) se implementa como un panel de 4 pestañas con formularios estructurados (uno por función), no como el chat de conversación libre con "import" de documentos que describe el mockup — porque los 4 endpoints de IA son consultas de catálogo (entrada 010), no un LLM con el que se pueda conversar. Esta parte queda **pendiente a propósito**, tal como pidió el usuario.

**Bugs encontrados y corregidos durante las pruebas en navegador (Playwright + Chromium headless, ver más abajo):**
1. `components/header.js` importaba `getCurrentUser` desde `auth.js`, pero esa función solo se exportaba desde `api.js` (auth.js la importaba pero no la reexportaba) — error de módulo ES que rompía la carga completa de la app. Corregido importando desde `api.js` directamente en `header.js`, y añadiendo `export { getCurrentUser }` en `auth.js` para que `home.js`/`jobs.js` (que ya la importaban desde `auth.js`) también funcionaran sin tocarlos.
2. Los iconos SVG de `assets/icons/` (`usuario.svg`, `burger-menu.svg`) no tienen `width`/`height` en la raíz del `<svg>`; usados dentro de `<img>` sin tamaño CSS explícito, el navegador los renderizaba a **0×0 píxeles** (confirmado con `boundingBox()` de Playwright) — completamente invisibles, no un problema de color. Corregido dando tamaño explícito en `layaut.css` (`.user-icon img`, `.burger img`).
3. `burger-menu.svg` además usaba un color de relleno casi invisible sobre fondo blanco (`#fcdf96`, crema pálido) — no coincide con el icono negro sólido de las capturas de Canva originales. Corregido el color del SVG a negro. (El resto de iconos del mismo lote — `adjuntar`, `archivo`, `añadir`, `enviar` — comparten colores igual de pálidos pero no están conectados a ninguna pantalla todavía, así que no se han tocado; quedan pendientes si se usan en el futuro.)
4. `main.css`: la regla `.main-container > .auth-screen` (y `.empty-state`) tenía `display:flex` sin `flex-direction:column`, así que el formulario de login y el enlace "¿No tienes cuenta?" se centraban **en fila** en vez de apilados — visible como el enlace flotando a la derecha del formulario. Corregido añadiendo `flex-direction: column`.

**Verificación:** flujo completo probado con Playwright (Chromium headless, sin sesión gráfica disponible en este entorno) contra el servidor real: registro y login de un `candidate` y un `recruiter`, creación de empresa+oferta inline, edición de oferta, postulación a una oferta, cambio de `status`, guardado de nota, navegación por las 8 pantallas de cada rol, y una consulta real a `POST /ai/cv-review` con resultado mostrado en pantalla — sin errores de consola. Un primer intento de probar el submit del formulario de oferta pareció fallar (el formulario no navegaba tras crear la oferta), pero se confirmó que era un selector ambiguo del propio script de prueba (`text=Crear oferta` coincidía también con el `<h2>` "Crear oferta laboral"), no un bug de la aplicación — con un selector preciso (`button[type="submit"]`) la creación funciona correctamente.

**Archivos afectados:** `frontend/js/*.js` (nuevo, ~12 archivos), `frontend/style/components.css` (nuevo), `frontend/style/main.css` y `frontend/style/layaut.css` (corregidos), `frontend/assets/icons/burger-menu.svg` (color corregido), `frontend/index.html` (drawer de navegación + carga de `app.js`), `backend/server.js` (`express.static` para servir el frontend).

---