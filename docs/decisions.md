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

## 012 — Internacionalización del frontend: español por defecto, selector es/en/fr/it
**Fecha:** Agosto 2026

**Problema:**
Toda la interfaz estaba escrita con texto fijo en español, mezclado directamente en el código de cada pantalla. El usuario pidió que la app fuera multilingüe, con español por defecto y el usuario pudiendo elegir su idioma.

**Alcance acordado con el usuario:**
- Idiomas: español (por defecto), inglés, francés, italiano.
- Solo el frontend. Los mensajes que devuelve literalmente la API (errores de validación, confirmaciones como "Empresa creada correctamente") se quedan siempre en español — traducirlos habría implicado tocar los 5 controllers y los validadores del backend ya cerrado y probado, por una ganancia menor (son mensajes de error/confirmación, no la experiencia principal de uso).

**Diseño:**
- `frontend/js/i18n.js`: diccionario plano por idioma (`"namespace.clave": "texto"`), función `t(key)` con fallback a español y luego a la propia clave si falta una traducción; idioma persistido en `localStorage` (`hireflow_lang`), por defecto `"es"` si no hay ninguno guardado.
- `router.js` exporta `refresh()` (vuelve a ejecutar la pantalla actual sin cambiar de ruta) para que, al cambiar de idioma, la pantalla visible se redibuje traducida sin perder la posición de navegación.
- Selector de idioma (`<select id="lang-switcher">`) fijo en la topbar, siempre visible (incluso sin sesión iniciada, a diferencia del menú de navegación) — `app.js` lo inicializa y llama a `refresh()` en cada cambio; `header.js` además redibuja el drawer al instante si está abierto.
- `document.documentElement.lang` se mantiene sincronizado con el idioma activo (antes estaba fijo en `"en"` aunque el contenido por defecto era español — corregido de paso).

**Problema encontrado durante el diseño — pills de "tipo de contrato/jornada" y "salario":** estas opciones se enviaban al backend usando directamente el texto visible de la pill como valor (`employment_type`/`salary`, columnas de texto libre en `job_offers`). Traducir solo la etiqueta habría hecho que cada idioma guardara un valor distinto para el mismo concepto (p. ej. "Indefinido" en español, "Permanent" en inglés), y las cards de otras pantallas no habrían podido traducirlo de vuelta al mostrarlo.

**Decisión:** se creó `frontend/js/jobOptions.js` con una lista cerrada de códigos estables en inglés (`full_time`, `permanent`, `1600`, etc. — coincide con el criterio ya usado en los datos de ejemplo del proyecto, p. ej. `full_time`), independientes del idioma. El pill muestra la etiqueta traducida pero guarda siempre el código; al mostrar una oferta en cualquier pantalla, el código se traduce de vuelta a la etiqueta del idioma activo. Si una oferta antigua tiene un valor que no coincide con ningún código conocido (texto libre de antes de este cambio), se muestra tal cual en vez de romper. Mismo criterio aplicado a los 5 valores de `status` de Applications (ya eran códigos estables en inglés del ENUM del backend, solo hacía falta traducir su visualización).

**Verificación:** probado con Playwright — idioma por defecto español en una sesión nueva sin `localStorage` previo; cambio a inglés con recarga completa de la pantalla de login; registro y navegación completa en inglés; cambio a francés con el drawer abierto (confirmado el redibujado inmediato); cambio a italiano y comprobación de que persiste tras recargar la página; y el caso más delicado: una oferta creada en español con la pill "Completa" se mostró correctamente como "Full-time" al cambiar a inglés, confirmando que el valor guardado es estable y solo la visualización cambia. Sin errores de consola.

**Archivos afectados:** `frontend/js/i18n.js` (nuevo), `frontend/js/jobOptions.js` (nuevo), `frontend/js/router.js` (`refresh()`), `frontend/js/app.js` (selector de idioma), `frontend/js/components/header.js`, y las 8 pantallas (`login.js`, `home.js`, `jobs.js`, `jobForm.js`, `applications.js`, `profileForm.js`, `calendar.js`, `ai.js`), `frontend/index.html` (`<select id="lang-switcher">`), `frontend/style/layaut.css` (estilos del selector).

---

## 013 — Home: resumen + accesos rápidos, en vez de solo texto de bienvenida
**Fecha:** Agosto 2026

**Problema:**
Probando la app manualmente, el usuario señaló que la pantalla de Home (un simple texto de bienvenida bajo el header, fiel al mockup original — ver `FRONTEND_DESIGN.md`, pantalla 1) se veía "muy vacía".

**Alternativas consideradas:**
- (a) Accesos rápidos: tarjetas grandes que llevan directo a Ofertas / Mis postulaciones / Calendario / Mi perfil / Asistente IA (según rol), reutilizando `card-grid`/`gradient-container` ya existentes.
- (b) Resumen tipo dashboard: contador de postulaciones (candidate) u ofertas publicadas (recruiter), desglose por estado, próxima entrevista.
- (c) Combinar (a) y (b).

**Decisión:** (c), elegida por el usuario tras presentarle las tres opciones.

**Diseño:**
- Candidate: dos tarjetas de estadística (total de postulaciones, próxima entrevista con fecha/hora localizada según el idioma activo — `toLocaleString(getLang())`, o "Ninguna programada" si no hay), más una fila de badges con el desglose por estado (reutilizando `applicationStatus.js`, extraído de `applications.js` a un módulo compartido para no duplicar el mapeo de estados).
- Recruiter: una única tarjeta con el número de ofertas propias (`created_by_user === user.id`, mismo filtrado client-side que ya usaba `jobs.js`, porque el backend no filtra `GET /jobs` por creador). No se muestra ningún dato de candidatos/aplicantes por oferta — no existe ningún endpoint que lo permita consultar (ver pendiente ya registrado en `FRONTEND_DESIGN.md`), y mostrar un "0" fijo o inventado habría sido engañoso.
- Los accesos rápidos son `<button>` reales (no `<div>` con `onClick`) dentro de las cards, para que sean accesibles/tabulables.

**Motivo:** el usuario pidió explícitamente combinar ambas ideas tras vérselas planteadas; esto se aparta del mockup original (que preveía Home como estado vacío puro), decisión que le correspondía a él tomar porque cambia el diseño ya aprobado.

**Verificación:** probado con Playwright con datos reales — candidate con 1 postulación y 1 entrevista agendada (vía API directa, no hay pantalla de creación de entrevistas en el frontend todavía), recruiter con 1 oferta publicada, comprobado en español e inglés (fecha localizada correctamente: "15/9, 10:00" en español vs "09/15, 10:00 AM" en inglés), y clic en una card de acceso rápido navegando a la pantalla correcta. Sin errores de consola.

**Archivos afectados:** `frontend/js/applicationStatus.js` (nuevo, extraído de `applications.js`), `frontend/js/screens/home.js` (reescrito), `frontend/js/screens/applications.js` (usa el módulo compartido), `frontend/js/i18n.js` (nuevas claves `home.*`), `frontend/style/components.css` (estilos de `.stat-card`, `.quick-link-card`, etc.).

---

## 014 — Asistente IA por chat libre (reglas, no LLM) + mascota global animada
**Fecha:** Agosto 2026

**Problema:**
El usuario pidió dos cosas relacionadas: (1) un asistente que "solo conteste cosas relacionadas con HireFlow", entienda lenguaje libre y haga preguntas de seguimiento cuando le falte información, en vez de las pestañas de categoría de la v1 (entrada 010); y (2) una mascota (imagen ya preparada en `frontend/assets/mascota-soporte.svg`, generada con la skill `imagegen` del proyecto) visible en todas las pantallas, que se mueva, se esconda a medias, dé volteretas y hable por un bocadillo con frases de ayuda y humor, sin taparbotones ni texto.

**Decisión 1 — motor del asistente (consultada con el usuario):**
Alternativas: (a) LLM real (Anthropic Claude API), con coste por uso y comprensión de lenguaje libre de verdad; (b) ampliar el sistema de reglas/palabras clave ya existente, gratis pero con comprensión limitada a frases esperadas en español.
**Elegida: (b)**, decisión explícita del usuario. Implica que el "entender lenguaje libre" es una aproximación por palabras clave, no comprensión real — limitación conocida y aceptada.

**Diseño del clasificador (`backend/models/aiAssistant.js`):**
- `classifyIntent(text)`: normaliza (minúsculas, sin acentos vía `\p{M}` tras `normalize("NFD")`) y cuenta coincidencias de frases por intención (`cv_review`, `interview_questions`, `interview_feedback`, `job_match`). La intención con más coincidencias gana; 0 coincidencias en todas → `off_topic` (aquí vive el "solo contesto temas de HireFlow" pedido); empate en el máximo → `ambiguous`.
- Extracción de "slots" por intención: `extractIndustry` (mapa de palabras clave → los 12 valores de `industry` reales de `ai_resume_guides`), `extractCategory`/`extractDifficulty` (opcionales, no bloquean), `extractSkillKeywords` (lista de palabras gatillo que se pasan tal cual a `findSkillImprovementBySkillNames`, que ya buscaba por `LIKE` — no hace falta un mapeo exacto), `extractJobMatches` (compara palabras del título de cada oferta contra el mensaje; si varias ofertas coinciden pero una lo hace con más palabras — título más específico —, se queda solo con esa en vez de pedir que desambigüe).
- `POST /ai/ask` (`controllers/aiControllers.js`): orquesta clasificación + extracción y reutiliza las funciones ya existentes de `models/ai.js` (`findResumeGuides`, `findInterviewQuestions`, `findSkillImprovementBySkillNames`, `matchJobSkills`). Si falta un dato obligatorio (industria, skill, oferta), devuelve `{type: "clarify", message: "..."}` en vez de un error 400 — así el frontend puede mostrarlo como una pregunta más del asistente. Los 4 endpoints originales (`/cv-review`, etc.) se mantienen intactos para uso directo/estructurado.
- Sin estado en el servidor: el frontend reenvía en cada turno el texto acumulado de la conversación (`pendingContext`), pero **solo mientras la respuesta previa fue `clarify`** — en cuanto llega una respuesta (`answer`) u `off_topic`, el contexto se reinicia. Se detectó y corrigió un bug real durante las pruebas: si se seguía acumulando todo el historial sin reiniciar, una vez respondida una pregunta (p. ej. sobre el CV), los mensajes siguientes seguían arrastrando esas palabras clave y el clasificador nunca podía cambiar de tema.
- Ampliación del catálogo ("mucha más información", pedido explícito del usuario): `ai_resume_guides` de 7 a 12 filas (+5 industrias: sanidad, ONG, logística, ingeniería, ventas) y `ai_skill_improvement` de 12 a 20 filas (+8 habilidades: negociación, oratoria, trabajo en equipo, gestión de proyectos, atención al detalle, resiliencia, pensamiento creativo, ventas y persuasión). De paso se corrigieron 3 typos de datos preexistentes en `industry` (`' creative_design'` con espacio inicial, `'customer_service,'` con coma final, `'public_acaddemic'` mal escrito) que hacían fallar el `WHERE industry = ?` exacto de `findResumeGuides` — no se habían detectado antes porque nunca se había probado ese camino con esos valores exactos.

**Decisión 2 — chat sin pestañas, con chips de sugerencia (consultada con el usuario):**
Se sustituyen las 4 pestañas de categoría por un único cuadro de texto libre + botón enviar, con historial de mensajes tipo chat. Se mantienen 2-3 chips de preguntas de ejemplo (no vinculantes, solo rellenan el input) para orientar a quien no sabe qué preguntar — decisión del usuario frente a la alternativa de chat completamente en blanco.

**Decisión 3 — alcance de idioma del asistente:** las respuestas del backend (`/ai/ask` incluido) siguen en español siempre, igual que el resto de la API (ver entrada 012) — la interfaz del chat (placeholder, botones, chips) sí está traducida a los 4 idiomas. No se ha construido un clasificador multi-idioma; es una limitación explícita, documentada, no un descuido.

**Decisión 4 — mascota global, colocación por "anclas" de viewport, no colisión real contra el DOM:**
Alternativas: (a) medir en tiempo real la posición de cada botón/texto de la pantalla activa y esquivarlos con precisión; (b) mover la mascota entre un conjunto fijo de posiciones ancladas al viewport (esquinas y bordes), alejadas de la columna central donde vive casi todo el contenido de esta app (formularios y listados centrados con `max-width`).
**Elegida: (b)**, sin consultarlo explícitamente por ser un detalle de implementación, no una decisión de producto — (a) exigiría remedir contenido dinámico en cada pantalla y timing complejo, coste desproporcionado para un elemento decorativo. Es una aproximación deliberada: funciona bien en las capturas probadas (viewport ancho/medio), degrada razonablemente en móvil (menos anclas, mascota más pequeña vía media query), pero no es una garantía matemática de "nunca tapar nada" en cualquier contenido futuro.
- `frontend/js/mascot.js`: bucle único (`setTimeout` recursivo, nunca `setInterval` en paralelo) que ejecuta una acción aleatoria cada 4-8s: moverse a otra ancla, dar una voltereta (`@keyframes` rotate 360°), "esconderse a medias" (`translateX` parcial hacia el borde más cercano y volver), o mostrar el bocadillo con una frase aleatoria. Una sola acción a la vez evita animaciones superpuestas o contradictorias.
- El bocadillo se abre hacia el lado y el borde (arriba/abajo) contrarios a los más cercanos a la mascota en cada momento (`mascot-side-left/right`, `mascot-vside-top/bottom`, recalculados en cada movimiento) — bug real encontrado y corregido durante las pruebas: con una orientación fija, el bocadillo se salía de la pantalla cuando la mascota estaba pegada al borde derecho o justo bajo el header.
- Frases del bocadillo (`i18n.js`, `getMascotPhrases(role)`): banco neutro (5 frases, se ve sin sesión iniciada o si el rol no está disponible) + banco específico de candidate o de recruiter (5 cada uno), mezclando consejos de la interfaz y frases con humor, en los 4 idiomas.
- Clic en la mascota navega a `/ai` (conecta la mascota decorativa con el asistente real).
- Montada una sola vez desde `app.js`, fuera de `.main-container` (en `#mascot-root`, hermano del contenedor que gestiona el router), así que persiste sin recrearse al cambiar de pantalla.

**Verificación:** probado con Playwright — los 4 tipos de respuesta del asistente (`answer`, `clarify`, `ambiguous`, `off_topic`) con mensajes reales, incluido el bug de contexto acumulado (antes y después del fix), y el caso de título de oferta ambiguo resuelto por especificidad; chips de sugerencia, tecla Enter, botón "Nueva conversación", cambio de idioma a mitad de chat. Mascota: visible sin sesión iniciada y con sesión, clic navega a `/ai`, se mueve entre anclas a lo largo de varios ciclos del bucle, bocadillo visible y legible completo en las posiciones extremas (esquina superior, esquina inferior) tras el fix de orientación. Regresión completa de las 8 pantallas + login en ambos roles repetida al final sin errores de consola.

**Archivos afectados:** `backend/models/aiAssistant.js` (nuevo), `backend/controllers/aiControllers.js` (+`askAssistant`), `backend/validators/aiValidators.js` (+`askValidators`), `backend/routes/aiRoutes.js` (+`POST /ai/ask`), `backend/database/seed.sql` (typos corregidos + contenido nuevo), BD real (poblada igual); `frontend/js/screens/ai.js` (reescrito como chat), `frontend/js/mascot.js` (nuevo), `frontend/style/mascot.css` (nuevo), `frontend/index.html` (`#mascot-root`), `frontend/js/app.js` (`initMascot()`), `frontend/js/i18n.js` (claves `ai.*` renovadas + `mascot.*` nuevas).

---

## 015 — Iconos SVG en el chat del asistente IA (nueva conversación, adjuntar, enviar)
**Fecha:** Agosto 2026

**Problema:**
El usuario pidió sustituir los controles de texto del chat del asistente (entrada 014) por los iconos SVG ya preparados en `frontend/assets/icons/` (`añadir.svg`, `adjuntar.svg`, `archivo.svg`, `enviar.svg`), dejando a mi criterio en qué botón usar cada uno ("mira a ver como quedan mejor"), con el requisito explícito de que cada imagen lleve `title` y `alt` para que su función se entienda al pasar el ratón por encima (los botones pasan a ser solo icono, sin texto visible).

**Mapeo de icono → función (decidido por la forma real de cada SVG, no por el nombre de archivo):**
- `añadir.svg` (signo "+") → botón "Nueva conversación": un "+" se lee de forma habitual en apps de chat (WhatsApp, Telegram) como "empezar de cero". El mismo icono, rotado 45° por CSS, se reutiliza como botón "quitar archivo adjunto" (una "+" girada es una "×").
- `adjuntar.svg` (clip) → botón que abre el selector de archivo (`<input type="file">` oculto), en la fila de escritura.
- `archivo.svg` (carpeta) → icono decorativo dentro de la "chip" que aparece cuando hay un archivo adjunto, junto al nombre del fichero.
- `enviar.svg` (bandeja de salida + flecha) → botón de enviar mensaje, sustituye al antiguo botón de texto "Enviar".

**Decisión — el archivo adjunto no se sube ni se procesa:** el asistente sigue siendo el clasificador por palabras clave de la entrada 014 (sin LLM), que no puede leer el contenido de un documento. Adjuntar un archivo solo añade su nombre entre corchetes al mensaje enviado a `/ai/ask` (p. ej. `revisa mi cv [Archivo adjunto: cv.pdf]`); el `title` de la chip lo deja explícito (`ai.attachedFileNote`) para no sugerir una capacidad que no existe.

**Corrección previa necesaria:** los 4 SVG usaban colores de relleno muy pálidos (`#fcdf96`, `#fccc96`, `#fcb896`) heredados del mismo lote de exportación de Illustrator que ya había dado el mismo problema en `burger-menu.svg` (corregido en una entrada anterior) — casi invisibles sobre el fondo crema/blanco de la app. Se sustituyeron por tonos del propio paleto (`#d98f3f`, `#f3a55c`, `#e8935a`) antes de integrarlos.

**Accesibilidad:** cada botón de icono lleva `title` + `aria-label` (tooltip nativo del navegador) y cada `<img>` lleva `alt`, usando las claves de i18n ya traducidas a los 4 idiomas (`ai.newConversation`, `ai.attachTitle`, `ai.sendButton`, `ai.attachedFileLabel`, `ai.attachedFileNote`, `ai.removeFileTitle`).

**Verificación:** probado con Playwright — los 3 botones de icono existen, tienen `title`/`alt` no vacíos, y los `<img>` miden 20×20px reales (no 0×0, el bug de SVG-sin-tamaño ya conocido de esta sesión); flujo completo adjuntar → ver chip con nombre correcto → quitar → volver a adjuntar → enviar (el mensaje del usuario incluye la referencia al archivo); botón "Nueva conversación" limpia el historial; cambio de idioma a inglés traduce el `title` del botón de enviar ("Send"); cero errores de consola en todo el flujo.

**Archivos afectados:** `frontend/js/screens/ai.js` (botones de icono, input de archivo oculto, chip de adjunto), `frontend/style/components.css` (`.chat-icon-button`, `.chat-send-icon`, `.chat-file-input`, `.chat-file-chip`), `frontend/assets/icons/añadir.svg`/`adjuntar.svg`/`archivo.svg`/`enviar.svg` (colores corregidos), `frontend/js/i18n.js` (+`ai.attachTitle`, `ai.attachedFileLabel`, `ai.attachedFileNote`, `ai.removeFileTitle` en los 4 idiomas).

---

## 016 — Responsive: tablet, móvil y móvil pequeño
**Fecha:** Agosto 2026

**Problema:**
El usuario pidió revisar el responsive de toda la app para que se vea bien en tablet, móvil y móvil pequeño. Se auditaron las 8 pantallas + login/registro con Playwright en 3 anchos de referencia (tablet 768px, móvil 390px, móvil pequeño 320px), en ambos roles.

**Bug principal encontrado — desbordamiento horizontal en (casi) todas las pantallas:** el causante era uno solo, la topbar. `.logo-title` tenía `font-size: 28px` fijo y el wordmark "HIREFLOW" en negrita no cabía junto al icono de usuario (48px), el selector de idioma y el botón de menú por debajo de ~480px de ancho — el navegador dejaba que la topbar se saliera del viewport, y como es la única franja fija de la interfaz, ese desbordamiento aparecía en cualquier pantalla (confirmado con `document.documentElement.scrollWidth > clientWidth`, verdadero en las 12 pantallas probadas a 320px y a 390px, falso en las 12 a 768px). El contenido de cada pantalla (formularios, tarjetas, calendario, chat) ya se adaptaba bien por sí solo gracias a los `max-width` centrados y los breakpoints existentes (`480px` en `card-grid`, `640px` en `week-calendar` y `ai-panel`) — no fue necesario tocarlos.

**Solución:**
- `.logo-title`: `font-size: clamp(16px, 6vw, 28px)` (se reduce de forma fluida en vez de con saltos bruscos) + `flex: 1; min-width: 0; overflow: hidden;` para que ocupe el espacio sobrante entre el icono de usuario y el bloque derecho sin empujarlos fuera; `white-space: nowrap` para que nunca parta el wordmark en dos líneas (rompería la altura fija de 80px de la topbar).
- Breakpoint nuevo a `480px` en `layaut.css`: reduce el padding de la topbar, el tamaño del icono de usuario, el gap y el tamaño del selector de idioma/botón de menú — con eso hay margen de sobra hasta los 320px probados.
- `html, body { overflow-x: hidden; }` en `main.css` como red de seguridad general (no todo desbordamiento horizontal viene de contenido en flujo normal — un elemento `position: fixed` mal calculado también puede ensanchar el documento).

**Otros hallazgos y su resolución:**
- Variable CSS `--hf-beige-dark` usada en los botones de icono del asistente IA (entrada 015) pero nunca definida en `:root` — el `hover` de esos botones no hacía nada visible. Añadida al bloque de paleta (`#d0bb8e`, mismo patrón que `--hf-orange-dark`).
- La mascota (entrada 014) se posiciona en "anclas" fijas del viewport para evitar el contenido centrado de cada pantalla; a partir de 600px de ancho usaba también las dos anclas junto al header, pero en móvil y tablet el contenido centrado ocupa casi todo el ancho disponible (a diferencia de escritorio, donde sobra margen a los lados), así que esas anclas quedaban encima del texto introductorio de pantallas como Home. Se subió el umbral que habilita las anclas junto al header de 600px a 1000px — por debajo de eso la mascota solo usa las anclas inferiores (y, a partir de 600px, también las laterales a media altura, que sí quedan libres porque el contenido alto no suele llegar hasta ahí).
- `.status-badge` (etiqueta de estado en las tarjetas de "Mis postulaciones") pasó de `inline-block` a `display: block` — compartía línea con el `<select>` de cambiar estado, quedando los dos muy pegados en pantallas estrechas (`Interesa [Interesa ▾]`); ahora cada uno va en su propia línea, con más aire también en tablet/escritorio.
- Dos "bugs" que resultaron ser artefactos de temporización de las propias pruebas, no fallos reales: el drawer de navegación (transición de 0.2s) y el cierre del drawer al navegar (mismo mecanismo) parecían "cortados" en capturas `fullPage` de Playwright tomadas antes de que la transición CSS terminara — confirmado repitiendo la comprobación con una espera adicional y con `boundingBox()`, que mostró la posición final correcta.

**Verificación:** Playwright, 3 anchos (768/390/320px) × 2 roles, flujo completo (registro, login, Home, Ofertas, crear oferta, Postulaciones incl. notas, Calendario, Perfil, Asistente IA incl. envío de mensaje) — sin desbordamiento horizontal en ninguna combinación tras el fix (antes: desbordamiento en las 12 pantallas de 320px y 390px), cero errores de consola.

**Archivos afectados:** `frontend/style/layaut.css` (topbar responsive), `frontend/style/main.css` (`overflow-x: hidden`), `frontend/style/components.css` (`--hf-beige-dark`, `.status-badge`), `frontend/js/mascot.js` (umbral de anclas junto al header).

---

## 017 — Flujo de contratación: postulantes visibles para la empresa, consentimiento al postularse, entrevistas agendadas por la empresa, y política de privacidad
**Fecha:** Agosto 2026

**Problema:**
El usuario probó la app como empleador y candidato y encontró un hueco real: al postularse como candidato a una oferta, esa postulación nunca aparecía en ningún sitio para la empresa que la publicó — no había forma de ver quién se había postulado. Junto con eso, pidió: (1) pedir consentimiento explícito y una "firma" al postularse, dejando claro que nunca se piden datos bancarios ni sensibles, solo teléfono/email de contacto; (2) que la empresa pueda agendar entrevistas en el calendario y mover el estado del candidato (entrevista, selección...) de forma que este se entere; (3) un documento de política de privacidad que se acepte al registrarse, pensado primero para la legislación española (RGPD/LOPDGDD) pero dejando la puerta abierta a Francia/Reino Unido/EEUU; (4) revisar qué hace falta para el formulario "Data Safety" de Google Play; (5) que los inputs de los formularios tengan `autocomplete`.

**Hallazgo al investigar (no pedido, corregido de paso):** `PUT/DELETE /jobs/:id` no comprobaba en ningún momento que la oferta perteneciera al recruiter autenticado — solo exigía rol `recruiter`, no propiedad. Cualquier empresa podía editar o borrar la oferta de otra. El frontend ya ocultaba las ofertas ajenas (`jobs.js` filtraba por `created_by_user`), pero eso es solo cosmético, no una barrera real. Se corrigió añadiendo `AND created_by_user = ?` a las dos queries (mismo patrón que ya usaban `applications`/`interviews`), verificado con un segundo recruiter de prueba: `DELETE` sobre la oferta ajena ahora devuelve 404 y la oferta sigue intacta.

**Decisión 1 — quién ve qué postulación, y cómo se comparten los datos de contacto:**
- Nuevo endpoint `GET /applications/recruiter`: todas las postulaciones recibidas en las ofertas del recruiter autenticado (`JOIN job_offers ON ... WHERE job_offers.created_by_user = ?`), nunca las de otro recruiter (verificado con un segundo recruiter: lista vacía). Las notas privadas del candidato (`applications.notes`) quedan fuera de la respuesta a propósito — son para uso personal del candidato, no para la empresa.
- El email y el teléfono del candidato solo viajan en esa respuesta si `consent_share_contact = 1` — comprobado con un `CASE WHEN` en la propia consulta SQL, no solo ocultado en el frontend, para que no dependa de que el cliente respete el flag.
- Pantalla nueva `/applicants` ("Postulantes", solo recruiter, enlace en el menú y en los accesos rápidos de Home): lista de postulantes con su oferta, un botón "Ver perfil" que despliega sector/ubicación/email/teléfono/firma (o un aviso de que el candidato no compartió contacto, si `consent_share_contact` fuera 0), un selector para mover el estado, y un botón para agendar una entrevista sobre esa postulación.

**Decisión 2 — consentimiento y "firma" al postularse:**
Nuevas columnas en `applications`: `consent_share_contact` (obligatoria, `express-validator` rechaza la postulación si no es `true`), `signature_name` (el candidato escribe su nombre completo, obligatorio) y `consent_at`. Antes de crear la postulación, `jobs.js` abre un modal (`<dialog>` nativo, ver Decisión 5) que explica exactamente qué se comparte (nombre, email, teléfono) y remarca que HireFlow nunca pedirá datos bancarios ni sensibles, con checkbox de consentimiento + campo de firma, ambos validados en el cliente y otra vez en el servidor.
**Importante — qué NO es esto:** la "firma" es una confirmación de UX (escribir el nombre completo como gesto deliberado de conformidad), no una firma digital/criptográfica ni electrónica avanzada con validez legal plena — limitación conocida y documentada aquí a propósito, para no dar una falsa sensación de garantía legal.

**Decisión 3 — mover el estado del candidato y que se entere ("notificación" sin email/push):**
- Nuevo endpoint `PUT /applications/:id/status` (solo recruiter, mismo patrón de propiedad vía `JOIN job_offers`), separado del `PUT /applications/:id` que ya usaba el candidato para autogestionar su propio tracker — cada uno solo puede tocar lo suyo (el recruiter no puede escribir en `notes`, el candidato no pierde su forma actual de mover su propio estado).
- Como esta app no tiene (ni se ha pedido) infraestructura de email/push, "notificar" se implementa dentro de la propia app: dos columnas nuevas, `status_updated_by` (`candidate`/`recruiter`) y `status_seen_by_candidate` (boolean). Cuando la empresa cambia el estado, se pone a 0; Home muestra entonces una tarjeta "Actualizaciones sin ver" con el recuento (calculado sobre la respuesta que ya devolvía `GET /applications`, sin endpoint adicional); al abrir "Mis postulaciones", esa pantalla llama a `PUT /applications/mark-seen` y las postulaciones afectadas muestran además una etiqueta "¡Actualizado por la empresa!" en esa misma visita (capturada como `wasUnseen` ANTES de marcar visto, para que no desaparezca antes de que el candidato la vea). Es una notificación in-app, no un email ni un push real — limitación conocida, coherente con que el resto de la app tampoco tiene esa infraestructura.

**Decisión 4 — entrevistas agendadas por la empresa:**
Se reutiliza la tabla `interviews` ya existente (vinculada a `applications`, que a su vez ya está en el calendario semanal desde antes) en vez de la tabla `calendar_events`, que existe en el esquema pero el frontend nunca llegó a usar (`calendar.js` siempre leyó de `/interviews`, no de `/calendar`) — así no hace falta construir un segundo sistema de calendario en paralelo. `POST/GET/DELETE /interviews` ahora ramifican por rol en el controlador: el candidato sigue creando/viendo solo sobre sus propias postulaciones (como ya hacía), y el recruiter agenda/ve/borra solo sobre postulaciones recibidas en sus propias ofertas (propiedad comprobada vía `JOIN job_offers.created_by_user`, nunca vía `applications.user_id`, que ahí es el candidato). La pantalla `/calendar` ganó un botón "Añadir entrevista" (solo visible para recruiter) que abre un modal para elegir postulante (de `GET /applications/recruiter`), fecha, lugar/enlace y notas; el candidato sigue viendo el calendario en modo solo lectura, igual que antes.
**Bug real encontrado y corregido durante las pruebas:** tanto en `calendar.js` como en `applicants.js`, el mensaje de éxito se añadía a un contenedor y ACTO SEGUIDO se llamaba a `draw()` para refrescar la lista — pero `draw()` empieza vaciando ese mismo contenedor, así que el mensaje desaparecía en el mismo instante en que se mostraba (confirmado con Playwright: el selector del mensaje de éxito nunca llegaba a aparecer). Se corrigió invirtiendo el orden: esperar a que `draw()` termine y solo entonces añadir el mensaje.

**Decisión 5 — modal reutilizable sobre `<dialog>` nativo:**
`components/ui.js` gana `openDialog(contentNodes)`, un envoltorio fino sobre el elemento `<dialog>` del navegador (`showModal()`), usado tanto por el consentimiento al postularse como por "agendar entrevista" y la política de privacidad. Se eligió `<dialog>` nativo en vez de construir un modal a mano con overlays y gestión de foco propia porque da backdrop, atrapo de foco y cierre con Escape gratis, sin librerías, coherente con el resto de la app (vainilla JS, sin dependencias de UI).

**Decisión 6 — política de privacidad (consultada solo parcialmente; el resto es una decisión de producto razonable, documentada aquí):**
- Nueva columna `users.terms_accepted_at`; `createUserValidators` exige `termsAccepted: true` para poder registrarse (comprobado también en el cliente antes de llamar a la API, con su propio mensaje de error).
- El contenido completo vive en `frontend/js/privacyPolicyContent.js` (estructura por secciones: responsable, qué se recoge, para qué, base legal, con quién se comparte, cuánto se conserva, derechos, "usuarios fuera de España", seguridad, menores, cambios), redactado siguiendo el RGPD (UE) 2016/679 y la LOPDGDD española, con una sección explícita que reconoce que si se accede desde el Reino Unido, Francia o California (EE. UU.) aplican además el RGPD del Reino Unido/ICO, la Loi Informatique et Libertés/CNIL, o la CCPA/CPRA respectivamente — así queda la puerta abierta a estas normativas sin tener que traducir ni adaptar todavía el documento completo a cada una.
- **Solo hay contenido completo en español e inglés**, no en francés/italiano — el resto de la app sí está traducida a los 4 idiomas (entrada 012), pero un texto legal de este tamaño en francés/italiano de calidad suficiente para ser realmente útil requiere más cuidado del que se le puede dar aquí; limitación documentada a propósito, no un descuido. La estructura por secciones en un objeto JS (`PRIVACY_POLICY_CONTENT`) está pensada para poder añadir esos dos idiomas más adelante sin tocar el resto del código.
- **Aviso explícito, dentro del propio documento y repetido aquí**: es un borrador orientativo para una app en desarrollo, no asesoría legal — debe revisarlo un profesional de protección de datos antes de publicar la app.
- Se muestra en un modal (Decisión 5) enlazado desde el checkbox de registro, en vez de navegar a una pantalla nueva, para no perder lo ya escrito en el formulario de registro (con hash routing, cambiar de ruta vuelve a montar la pantalla desde cero).
- **Bug real encontrado y corregido durante las pruebas:** el enlace "Política de Privacidad" estaba anidado dentro del mismo `<label>` que envuelve el checkbox de aceptación. Un `<label>` que envuelve un checkbox activa ese checkbox al hacer click en cualquier punto de su interior — con el enlace anidado ahí dentro, un click impreciso (más probable en móvil, con el dedo) podía marcar la casilla en lugar de abrir el diálogo. Se sacó el enlace fuera del `<label>` (como hermano, no como hijo).

**Decisión 7 — Google Play "Data Safety" — corrección de una idea equivocada, no solo una implementación:**
El pedido original ("que rellenen el formulario de Data Safety") parte de una idea equivocada: ese formulario no lo rellenan los usuarios de la app -- es una sección de Google Play Console que rellena el **desarrollador/publisher** una sola vez al dar de alta la ficha de la app, y ni siquiera existe una pantalla equivalente dentro de una app Android normal. No tenía sentido construir una pantalla en HireFlow para que los usuarios "la rellenen". En su lugar, se preparó `docs/googlePlayDataSafety.md`: un borrador de las respuestas que Ana debería marcar en ese formulario cuando llegue el momento de publicar en Play Store, basado en lo que la app realmente recoge/comparte/permite borrar hoy. Incluye un pendiente detectado de paso: Google exige un enlace público a la política de privacidad, y hoy esa política solo vive dentro de la app (modal de registro) — hace falta alojarla también en una URL pública antes de poder publicar.

**Decisión 8 — `autocomplete` en los formularios:**
Se añadieron los valores estándar de WHATWG donde hay una correspondencia clara: `email`/`username` según el modo del formulario de login, `new-password`/`current-password`, `name`, `tel`, `organization` (nombre de empresa), `organization-title` (sector del candidato / título de la oferta — no es una correspondencia perfecta pero es la más cercana del estándar), `address-level2` (ubicación, como aproximación a "ciudad/región"). Se dejó sin `autocomplete` explícito los campos sin un token razonable (descripción, skills, notas) en vez de forzar un valor incorrecto.

**Verificación:** Playwright end-to-end con dos roles — registro rechazado sin aceptar la política (con y sin abrir el modal), oferta creada por un recruiter, postularse con el modal de consentimiento (rechazado sin casilla, rechazado sin firma, aceptado con ambos), el recruiter ve al postulante en `/applicants`, expande su perfil (contacto visible porque hubo consentimiento), cambia el estado a "entrevista" (mensaje de éxito visible tras el fix), agenda una entrevista (modal + aparece en su calendario con nombre del candidato y oferta), el candidato ve la tarjeta de "actualizaciones sin ver" en Home y la etiqueta "actualizado por la empresa" en Postulaciones, y tras visitar esa pantalla el aviso de Home desaparece; el candidato ve también la entrevista en su calendario. Aparte, verificación específica de los límites de propiedad por `curl`: un candidato recibe 403 en `/applications/recruiter`; un segundo recruiter no puede borrar la oferta del primero (404, antes del fix hubiera devuelto 200) ni ve a sus postulantes (lista vacía). Cero errores de consola en todo el flujo.

**Archivos afectados:** `backend/database/shema.sql` (columnas nuevas + fix de duplicado de todo el archivo, ver más abajo), BD real (migrada con `ALTER TABLE`); `backend/models/application.js`, `applicationControllers.js`, `applicationValidators.js`, `applicationRoutes.js`; `backend/models/interview.js`, `interviewControllers.js`; `backend/models/jobOffer.js`, `jobOfferControllers.js` (fix de propiedad); `backend/models/User.js`, `userValidators.js`; `frontend/js/screens/applicants.js` (nuevo), `frontend/js/screens/jobs.js`, `frontend/js/screens/calendar.js`, `frontend/js/screens/home.js`, `frontend/js/screens/applications.js`, `frontend/js/screens/login.js`, `frontend/js/screens/profileForm.js`, `frontend/js/screens/jobForm.js`; `frontend/js/components/ui.js` (+`openDialog`), `frontend/js/components/header.js`, `frontend/js/components/privacyPolicyDialog.js` (nuevo); `frontend/js/privacyPolicyContent.js` (nuevo), `frontend/js/auth.js`, `frontend/js/app.js`; `frontend/style/components.css` (`.hf-dialog*`); `frontend/js/i18n.js` (namespaces `applicants.*` nuevo, ampliaciones en `jobs.*`, `calendar.*`, `auth.*`, `home.*`, `applications.*`, `common.*`, `nav.*`, en los 4 idiomas); `docs/googlePlayDataSafety.md` (nuevo).

**Nota aparte — `shema.sql` estaba duplicado de arriba a abajo** (todo el contenido del archivo aparecía dos veces seguidas, incluido un segundo `CREATE database hireflow`, que habría hecho fallar una instalación limpia). No tiene relación con esta funcionalidad, pero al tener que tocar ese archivo para las columnas nuevas se aprovechó para dejarlo limpio.

---

---

## 018 — Eliminado `GET /users`: exponía los datos de contacto de todos los usuarios

**Problema:** `GET /api/users` solo exigía `verifyToken`, así que cualquier usuario con sesión (candidato o recruiter) recibía `name`, `email`, `phone`, `sector` y `location` de todos los usuarios registrados. Esto anulaba el sistema de consentimiento de la entrada 017: una empresa podía obtener el teléfono de un candidato sin que se hubiera postulado a ninguna de sus ofertas, y un candidato podía obtener los datos de otros candidatos.

**Decisión:** eliminar la ruta en vez de protegerla. Ninguna pantalla del frontend la usaba (el usuario actual sale del JWT o de `GET /users/me`) y la app no tiene rol de administrador que la justifique. Si en el futuro hace falta un panel de administración, se añadirá un rol `admin` con su propia ruta y `requireRole(["admin"])`, en lugar de reabrir esta.

**Verificación:** `GET /api/users` con token válido devuelve 404 (lo recoge `notFound`); registro (`POST /users`), login, `GET/PUT/DELETE /users/me` siguen funcionando.

**Archivos afectados:** `backend/routes/userRoutes.js`, `backend/controllers/userControllers.js` (`getUsers` eliminado), `backend/models/User.js` (`getAllUsers` eliminado), `postman/collections/HireFlow API/Users/Get Users.request.yaml` (eliminado), `docs/api.md`, `docs/projectStatus.md`, `docs/changeLog.md`.

---

## 019 — Las empresas tienen dueño: solo quien la creó puede editarla o borrarla

**Problema:** la tabla `companies` no guardaba quién había creado cada empresa, así que `PUT` y `DELETE /companies/:id` solo comprobaban el rol `recruiter`. Cualquier empresa podía:
- renombrar o cambiar los datos de contacto de otra empresa;
- borrarla, y con ella, por los `ON DELETE CASCADE` (`fk_job_company`, `fk_application_job`), todas sus ofertas y **todas las postulaciones de los candidatos** a esas ofertas;
- publicar ofertas a nombre de otra empresa (`POST /jobs` con un `company_id` ajeno), o mover una oferta propia a otra empresa.

Es el mismo tipo de fallo que ya se corrigió en ofertas (entrada 017), pero en la tabla de la que cuelga todo lo demás.

**Decisión 1 — columna `companies.created_by_user`** (FK a `users`, `ON DELETE SET NULL`, mismo patrón que `job_offers.created_by_user`). Se fija siempre desde el token al crear, nunca desde el body, y no está en la lista blanca de campos actualizables. `updateCompany` y `deleteCompany` filtran por `id` y `created_by_user` en la propia query (como en el resto del proyecto, nunca leyendo y comprobando después en el controller).

**Decisión 2 — ofertas solo sobre empresas propias.** `createJobOffer` pasa a ser un `INSERT ... SELECT FROM companies WHERE id = ? AND created_by_user = ?` (patrón de `createInterview`): si la empresa no es del recruiter, no se inserta nada y se responde 400. En `updateJobOffer`, si se envía `company_id` tiene que ser la empresa actual de la oferta o una propia. Se acepta la actual para no bloquear la edición de ofertas antiguas cuya empresa se quedó sin dueño al migrar.

**Decisión 3 — no se borra una empresa con ofertas (409).** Aunque ya solo pueda hacerlo su dueño, un único clic borraba en cascada las postulaciones de los candidatos, que son datos suyos, no de la empresa. Ahora el recruiter tiene que borrar antes las ofertas, una a una. Se eligió bloquear en vez de cambiar la FK a `RESTRICT` para poder devolver un mensaje claro y distinguirlo de "no existe o no es tuya" (404).

**Decisión 4 — migración de datos existentes** (`backend/database/migrations/019_companies_created_by_user.sql`, aplicada a `hireflow` y `hireflow_demo`). Cada empresa pasa a ser del recruiter que publicó sus ofertas, solo si todas son del mismo recruiter. Las que no cumplen eso (en `hireflow`, 16 empresas de pruebas antiguas sin ofertas o con ofertas sin autor) quedan sin dueño: nadie puede editarlas ni borrarlas desde la API, que es la opción segura. En `hireflow_demo` las 4 empresas quedaron asignadas a Marta, y `hireflow-datos.js` (herramienta de grabación de la demo) ya las crea con su token, así que sigue funcionando sin cambios.

**Frontend:** el desplegable de empresa del formulario de oferta (`jobForm.js`) solo muestra las empresas del propio recruiter, más la empresa actual cuando se edita una oferta.

**Verificación** (curl contra `hireflow_demo`, con un segundo recruiter de prueba borrado al terminar):
- el otro recruiter recibe 404 al editar o borrar la empresa de Marta, 400 al publicar en ella y 404 al mover su oferta a ella;
- con su propia empresa puede publicar y editar ofertas; borrar la empresa con ofertas da 409 y, sin ofertas, 200;
- Marta sigue pudiendo editar su empresa y sus ofertas;
- una candidata recibe 403.

En el navegador (Playwright): Marta ve sus 4 empresas en "Nueva oferta" y el otro recruiter solo la suya, sin errores de consola.

**Archivos afectados:** `backend/database/shema.sql`, `backend/database/migrations/019_companies_created_by_user.sql` (nuevo), `backend/models/company.js`, `backend/controllers/companyControllers.js`, `backend/models/jobOffer.js`, `backend/controllers/jobOfferControllers.js`, `frontend/js/screens/jobForm.js`, `docs/api.md`, `docs/projectStatus.md`, `docs/changeLog.md`.

---

## 020 — Login: mensaje de error genérico y límite de intentos

**Problema:** `POST /users/login` respondía "Usuario no encontrado" si el email no existía y "contraseña incorrecta" si existía. Así cualquiera podía comprobar qué emails tienen cuenta en HireFlow (enumeración de usuarios), algo delicado en una app de empleo: confirma que una persona concreta está buscando trabajo. Además no había límite de intentos, así que se podía probar contraseñas sin freno.

**Decisión 1 — mismo mensaje y mismo código en los dos casos:** `401 {"message":"Email o contraseña incorrectos"}`. Se pasa de 400 a 401 porque el problema son las credenciales, no el formato de la petición (los errores de formato siguen siendo 400, vía `validate`).

**Decisión 2 — mismo tiempo de respuesta.** Aunque el mensaje sea igual, si el email no existía se respondía al instante y si existía se esperaba a `bcrypt.compare` (~80 ms), así que el tiempo seguía delatando el email. Ahora, si el usuario no existe, se compara contra un hash de relleno (`DUMMY_PASSWORD_HASH`, calculado una vez al arrancar), y los dos casos cuestan lo mismo.

**Decisión 3 — límite de intentos con `express-rate-limit`** (`middleware/rateLimiters.js`, `loginLimiter`, solo en `/users/login`): 10 intentos fallidos por IP cada 15 minutos; el siguiente recibe 429. Con `skipSuccessfulRequests` los logins correctos no cuentan: un usuario normal nunca lo nota, ni tampoco la herramienta de grabación de la demo (`grabar-demos`), que inicia sesión varias veces seguidas. Se limita por IP y no por email para que un atacante no pueda bloquear la cuenta de otra persona a propósito fallando su contraseña. El contador vive en memoria (se reinicia al reiniciar el servidor); si algún día hay varias instancias, habrá que pasarlo a un almacén compartido (Redis).

**Decisión 4 — mensajes traducidos en el frontend.** Los mensajes del backend solo están en español, así que `login.js` traduce por código de estado (401 → `auth.invalidCredentials`, 429 → `auth.tooManyAttempts`) en los 4 idiomas.

**Fuera de alcance, a propósito:** el registro sigue diciendo "El email ya está registrado". Evitarlo exige un flujo de confirmación por email, que la app todavía no tiene; se deja anotado.

**Verificación** (curl contra `hireflow_demo`):
- un email inexistente y una contraseña mala devuelven el mismo 401 y el mismo mensaje, en tiempos equivalentes (~0,09–0,14 s);
- el login correcto devuelve 200;
- 5 logins correctos seguidos no cuentan para el límite;
- el 11.º intento fallido devuelve 429 con las cabeceras `RateLimit`.

En el navegador (Playwright): el mensaje sale en español y, al cambiar a inglés, en inglés, tanto para el 401 como para el 429.

**Archivos afectados:** `backend/middleware/rateLimiters.js` (nuevo), `backend/routes/userRoutes.js`, `backend/controllers/userControllers.js`, `backend/package.json` y `backend/package-lock.json` (`express-rate-limit`), `frontend/js/screens/login.js`, `frontend/js/i18n.js`, `docs/api.md`, `docs/projectStatus.md`, `docs/changeLog.md`.

---

## 021 — Cabeceras de seguridad (`helmet`) y contraseñas más fuertes

**Problema:** el servidor no enviaba ninguna cabecera de seguridad y anunciaba `X-Powered-By: Express`. Sin Content-Security-Policy, cualquier fallo de inyección de HTML en el frontend podía acabar ejecutando scripts, y sin `X-Frame-Options` se podía meter HireFlow en un `<iframe>` de otra web para engañar al usuario (clickjacking). Además, la contraseña mínima era de 6 caracteres sin ninguna otra regla, así que se aceptaba `123456`.

**Decisión 1 — `helmet` con su configuración por defecto y una CSP ajustada** a lo que el frontend carga de verdad. Se revisó antes: no hay scripts inline, ni `eval`, ni atributos `style` en el HTML (el helper `el()` y la mascota usan `element.style`, que la CSP permite), y la mascota se carga como `<img>`. Lo único externo es la fuente Lato:
- `script-src 'self'` (por defecto) y `script-src-attr 'none'`: solo los módulos propios, ningún `onclick=` inline;
- `style-src 'self' https://fonts.googleapis.com` y `font-src 'self' https://fonts.gstatic.com`: más estricta que la de helmet por defecto, que permite cualquier `https:` y `'unsafe-inline'`;
- `upgrade-insecure-requests` desactivado: la app se sirve por http (localhost, o la IP de la red local al probarla en el móvil) y esa directiva forzaría https en todas las peticiones, rompiendo la app;
- `frame-ancestors 'self'` y `X-Frame-Options: SAMEORIGIN`: nadie puede incrustar HireFlow en otra web. La demo del portfolio es un vídeo, no un `iframe`, así que no le afecta.

**Decisión 2 — contraseñas de 8 a 72 caracteres, con al menos una letra y un número** (`createUserValidators`). El máximo es 72 porque bcrypt ignora lo que pase de 72 bytes: una contraseña más larga daría una seguridad falsa. No se exigen símbolos ni mayúsculas: las guías actuales (NIST SP 800-63B) priorizan la longitud frente a las reglas de composición, que llevan a contraseñas previsibles como `Clave2026!`. La regla solo se aplica al registrarse: el login no valida el formato, así que las cuentas antiguas con contraseñas más cortas siguen entrando. La contraseña de la demo, `demo2026`, cumple la regla.

**Frontend:** el registro comprueba las mismas reglas antes de enviar el formulario, con un mensaje traducido en los 4 idiomas (`auth.passwordRules`), y el campo lleva `minlength`/`maxlength`. En el login no se añaden, para no dar pistas del formato.

**Verificación** (contra `hireflow_demo`):
- con curl, la página devuelve la CSP y el resto de cabeceras, sin `X-Powered-By`; al registrarse, `abc12`, `abcdefgh` y `12345678` dan 400 con el motivo y `clave2026` da 201;
- con Playwright, se recorrieron todas las pantallas de candidata y de recruiter (incluido enviar un mensaje al asistente IA y abrir el menú): **0 violaciones de CSP y 0 errores**, con la fuente Lato y la mascota cargadas;
- el aviso de contraseña del registro aparece antes de enviar el formulario.

Los usuarios de prueba se borraron al terminar.

**Archivos afectados:** `backend/server.js`, `backend/validators/userValidators.js`, `backend/package.json` y `backend/package-lock.json` (`helmet`), `frontend/js/screens/login.js`, `frontend/js/i18n.js`, `docs/api.md`, `docs/projectStatus.md`, `docs/changeLog.md`.

---

## 022 — El router muestra los errores como texto, no como HTML; favicon

**Problema:** cuando una pantalla fallaba al cargar, `router.js` mostraba el error así:

```js
mainContainer.innerHTML = `<p class="error-text">${t("common.loadError")} ${error.message}</p>`;
```

`error.message` puede venir del backend o incluir datos escritos por un usuario, y con `innerHTML` se interpretaba como HTML: un mensaje con `<img src=x onerror=...>` habría ejecutado código en el navegador de quien lo viera (XSS). Era el único sitio del frontend que se saltaba la regla del helper `el()` de `components/ui.js`, pensado precisamente para evitar esto. La CSP de la entrada 021 ya bloqueaba los scripts inline, pero no conviene depender de una sola barrera.

**Decisión:** crear el párrafo con `el("p", { class: "error-text", text: ... })`, igual que el resto de la app, para que el mensaje siempre se muestre como texto.

**Favicon:** la app no tenía, así que el navegador pedía `/favicon.ico` en cada carga y la consola mostraba un 404, lo que ensuciaba las pruebas de "cero errores de consola". Se añade `frontend/assets/icons/favicon.svg`: la "H" naranja del logo (`#ebad64`) sobre el crema de la app (`#fdf6ea`). Está dibujada con rectángulos y no con texto, para que no dependa de las fuentes del sistema.

**Verificación** (Playwright contra `hireflow_demo`): se sustituyó al vuelo el módulo de la pantalla Calendario por uno que lanza `new Error('<img src=x id="inyectado"><b>negrita</b>')`.
- Con el `router.js` anterior, el HTML se interpretaba: aparecían 2 elementos inyectados en la página.
- Con el nuevo, el mensaje se ve tal cual, como texto, y no aparece ninguno.
- El favicon responde 200 y no queda ningún error en la consola.

**Archivos afectados:** `frontend/js/router.js`, `frontend/index.html`, `frontend/assets/icons/favicon.svg` (nuevo), `docs/changeLog.md`.

---

## 023 — Estados de las postulaciones: quién mueve cada uno

**Problema:** tres fallos del flujo de contratación, relacionados entre sí:
1. **"Postularme" creaba la postulación en `wishlist`** ("Interesa") y sin `applied_date`, aunque la empresa ya la recibía con los datos de contacto y la firma. El candidato veía "Interesa" justo después de postularse (se ve en el vídeo de la demo).
2. **El candidato podía cambiar el estado a lo que quisiera**, incluso "Oferta recibida" o "En entrevista", y pisar lo que había decidido la empresa, que luego lo veía así en su lista. Además, `PUT /applications/:id` sobrescribía siempre estado y notas, y marcaba `status_updated_by = 'candidate'`, así que **guardar una nota borraba el aviso de "¡Actualizado por la empresa!"**. La empresa, por su parte, podía devolver a un candidato a "Interesa".
3. **Agendar una entrevista no cambiaba el estado**: la empresa tenía que ponerlo en "En entrevista" a mano, y si se le olvidaba el candidato tenía una entrevista en el calendario con la postulación en "Postulado".

**Decisión 1 — el estado inicial depende de si hay oferta.** Con `job_offer_id`, la postulación nace en `applied` con la fecha del día. Sin oferta (un seguimiento personal de una oferta de fuera, que la API permite aunque hoy ninguna pantalla lo cree), sigue naciendo en `wishlist`.

**Decisión 2 — en una postulación a una oferta de HireFlow, el estado es de la empresa.**
- El candidato ve el estado y puede **retirar** la postulación (`DELETE`), pero no cambiarlo: si envía un `status` distinto del actual recibe 403, con un mensaje que le sugiere retirarla. Enviar el mismo estado que ya tiene no falla, para no romper clientes que reenvían la postulación entera.
- Los seguimientos personales (sin oferta) conservan el estado libre, porque ahí no hay empresa que lo gestione.
- La comprobación va en la propia query (`AND (job_offer_id IS NULL OR status = ?)`); solo si no se actualiza nada se lee la postulación para distinguir 404 (no existe o no es suya) de 403.
- `PUT /applications/:id` pasa a ser **parcial**, como el resto de recursos: notas y estado por separado. `status_updated_by` solo cambia a `candidate` si el estado cambia de verdad, así que guardar una nota ya no borra el aviso de la empresa.
- La empresa ya no puede poner `wishlist` (`RECRUITER_STATUS_VALUES` en el validador y `RECRUITER_STATUS_OPTIONS` en el frontend). Si una postulación antigua sigue en `wishlist`, su desplegable muestra esa opción para reflejar el estado real.

**Decisión 3 — agendar una entrevista mueve la postulación a `interview`.** En `createInterviewForRecruiter`, dentro de una transacción con el `INSERT`: si estaba en `wishlist` o `applied` pasa a `interview` y se avisa al candidato (`status_updated_by = 'recruiter'`, `status_seen_by_candidate = 0`), igual que con un cambio manual. Si ya estaba en `offer` o `rejected` no se toca, porque sería retroceder. La respuesta incluye `application_status_changed`. No se hace lo mismo cuando la agenda el propio candidato: su entrevista puede ser de un seguimiento personal.

**Frontend:**
- **Mis postulaciones:** en las postulaciones a ofertas desaparece el desplegable de estado y aparece "Retirar postulación", con un diálogo propio (`openDialog`, no el `confirm()` nativo) que explica que la empresa dejará de verla, junto con los datos de contacto y las entrevistas (que se borran en cascada). Encima de la lista, una sola vez, se explica que el estado lo actualiza la empresa. Las notas se guardan enviando solo `notes`.
- **Postulantes:** el desplegable ya no ofrece "Interesa". Tras agendar una entrevista se redibuja la lista antes de mostrar el aviso, para que se vea el estado nuevo.
- Todos los textos están en los 4 idiomas, y los desplegables de estado llevan `aria-label`.

**Datos existentes:** no hizo falta migrar nada. En `hireflow`, las 3 postulaciones en `wishlist` son anteriores al consentimiento (sin firma), así que no vienen de "Postularme"; en `hireflow_demo` no había ninguna.

**Demo:** `hireflow-datos.js` sigue funcionando sin cambios, porque solo usa estados que la empresa puede poner. En `hireflow.js`, el paso en que Marta pone "En entrevista" a mano antes de agendar ya no hace falta, aunque no molesta; y en el vídeo, la postulación nueva de Lucía saldrá como "Postulado".

**Verificación** (contra `hireflow_demo`):
- Con curl:
  - postularse da `applied` con fecha;
  - la candidata recibe 403 al poner `offer`, 200 al reenviar el mismo estado, 400 con el body vacío y 404 con un id ajeno;
  - guardar una nota en una postulación actualizada por la empresa mantiene `status_updated_by = recruiter`;
  - la empresa recibe 400 con `wishlist`;
  - agendar sobre una postulación `applied` la pasa a `interview` con `visto = 0`, y sobre una en `offer` no la toca;
  - retirar la postulación borra también su entrevista;
  - un seguimiento personal nace en `wishlist` y sí se puede mover.
- Con Playwright, candidata:
  - se postula y ve "Postulado", sin desplegable y con "Retirar postulación";
  - cancelar el diálogo mantiene la tarjeta y confirmarlo la quita;
  - guarda una nota.
- Con Playwright, empresa: el desplegable ofrece solo Postulado, En entrevista, Oferta recibida y Rechazado; al agendar la entrevista de Pablo, su tarjeta pasa de "Postulado" a "En entrevista".
- Sin errores de consola. Al terminar, `hireflow_demo` se rellenó de nuevo con `hireflow-datos.js`.

**Archivos afectados:** `backend/controllers/applicationControllers.js`, `backend/models/application.js`, `backend/validators/applicationValidators.js`, `backend/models/interview.js`, `frontend/js/applicationStatus.js`, `frontend/js/screens/applications.js`, `frontend/js/screens/applicants.js`, `frontend/js/i18n.js`, `docs/api.md`, `docs/changeLog.md`.

---

## 024 — Calendario por semanas

**Problema:** `calendar.js` calculaba el día de la semana de cada entrevista (`getDay()`) y las metía en 6 columnas fijas, de lunes a sábado, sin mirar la fecha. Consecuencias:
- se mezclaban semanas: una entrevista del lunes 1 y otra del lunes 22 salían en la misma columna, y las cabeceras no tenían fecha, así que no había forma de saber de qué semana era cada una;
- las entrevistas pasadas no desaparecían nunca;
- las del domingo se descartaban (`index < 6`), así que una entrevista en domingo no aparecía en ningún sitio;
- borrar una entrevista no pedía confirmación y, si fallaba, el error acababa en la consola.

**Decisión — calendario de una semana con navegación:**
- Se muestra la semana actual (de lunes a domingo, 7 columnas) con botones de semana anterior, "Hoy" y semana siguiente, y el rango como título ("21–27 sept 2026").
- Cada cabecera lleva el nombre del día y la fecha, y la columna de hoy se resalta en naranja.
- Nombres de días, fechas y horas salen de `Intl`/`toLocale*` con el idioma activo, en vez de claves de traducción fijas: así se ven bien en los 4 idiomas sin mantener 28 cadenas (se eliminaron `calendar.mon`…`calendar.sat`), y el rango usa `Intl.DateTimeFormat.formatRange` cuando el navegador lo tiene.
- La semana visible se guarda fuera de `render()`, así que al cambiar de idioma no se vuelve a la semana actual.
- **Semana vacía:** se dice ("No hay entrevistas esta semana") y, si hay alguna entrevista más adelante, un botón salta a su semana. Así la candidata no tiene que ir pulsando "›" a ciegas.
- **Tras agendar** una entrevista, se salta a la semana de esa entrevista y solo entonces se muestra el aviso.
- **Borrar** pide confirmación con un diálogo propio (fecha, hora y candidato, y que también desaparecerá del calendario del candidato), y muestra los errores dentro del diálogo.
- **Móvil (≤ 640px):** los días van en lista, uno debajo de otro, y se ocultan los días vacíos salvo hoy, para no obligar a hacer scroll de siete bloques con un guion.
- La pantalla tiene su propio contenedor (`.calendar-screen`, máx. 1040px) en vez de `.list-slot` (720px, pensado para listas de tarjetas), que dejaba 7 columnas demasiado estrechas y la barra de semana desalineada.

**Backend:** `getInterviewsByUser` (vista del candidato) devuelve también `job_title` y `company_name` con `LEFT JOIN` (la postulación puede no tener oferta). Antes el candidato veía en su calendario solo la hora y el lugar, sin saber de qué oferta era la entrevista.

**Verificación** (Playwright contra `hireflow_demo`):
- La candidata ve la semana actual con fechas en cada día, el jueves de hoy resaltado y sus 3 entrevistas con oferta y empresa ("Full Stack Node.js · Brisa Software").
- La semana siguiente sale vacía con su mensaje; "Hoy" vuelve a la actual, y al pasar a inglés se mantiene la semana con los días traducidos.
- En la empresa, cancelar el diálogo de borrar no toca nada.
- Una entrevista agendada para dentro de 10 días (que cae en **domingo**) salta a su semana y aparece; en una semana pasada vacía, "Ir a la próxima" lleva a la siguiente entrevista; la entrevista de prueba se borró confirmando el diálogo.
- En móvil (390px) solo se ven los 3 días con entrevistas y no hay desbordamiento horizontal.
- Cero errores de consola.

`hireflow_demo` se volvió a rellenar con `hireflow-datos.js`. El guion de la demo (`hireflow.js`) sigue funcionando: espera "Videollamada" en el calendario, y los datos de demo ponen las entrevistas en la semana actual.

**Archivos afectados:** `frontend/js/screens/calendar.js`, `frontend/style/components.css`, `frontend/js/i18n.js` (claves nuevas `calendar.prevWeek`, `nextWeek`, `today`, `emptyWeek`, `goToNext`, `deleteTitle`, `deleteText`, `deleteConfirm` en los 4 idiomas; eliminadas `calendar.mon`…`sat`), `backend/models/interview.js`, `docs/api.md`, `docs/changeLog.md`.

---

## 025 — Sesión caducada: volver al login con aviso y a la pantalla donde se estaba

**Problema:** el token JWT dura 1 hora (`expiresIn: "1h"`), pero el frontend no lo tenía en cuenta:
- `getCurrentUser()` decodificaba el token sin mirar `exp`, así que para el router la sesión seguía abierta aunque hubiera caducado;
- `apiFetch` no hacía nada especial con un 401, así que, pasada la hora, **todas las pantallas mostraban "token de autentificación no valido"** y la única salida era abrir el menú y cerrar sesión a mano. Con la app abierta en una pestaña, era lo primero que veía quien volvía a ella.

De paso, dos fallos de `verifyToken` (backend):
- llamaba a `next()` dentro de su `try`, así que un error síncrono de cualquier middleware o controller posterior se respondía como 401 "token no válido", ocultando el error real;
- hacía `console.log(error)` de cada token caducado, llenando el log de trazas por algo normal.

**Decisión 1 — el frontend detecta la caducidad de dos formas:**
- **Al cargar o navegar:** `getCurrentUser()` mira `exp` del payload; si ya pasó, el token cuenta como sesión cerrada (se borra) y el router manda al login como con cualquier ruta protegida.
- **En mitad del uso:** si una petición con token recibe 401 (salvo el propio `/users/login`, cuyo 401 es "credenciales incorrectas"), `apiFetch` cierra la sesión y lleva al login. Cubre también tokens que el cliente cree válidos y el servidor rechaza (por ejemplo, si se cambia `JWT_SECRET`).

**Decisión 2 — avisar y devolver al usuario donde estaba.** Al detectar la caducidad se guarda en `sessionStorage` la ruta que se estaba usando.
- El login muestra un aviso informativo (`infoBanner`, en tono crema y no rojo, porque no es un error del usuario): "Tu sesión ha caducado. Vuelve a iniciar sesión para continuar donde lo dejaste."
- Tras iniciar sesión se vuelve a esa ruta en vez de a Home.
- La marca solo se borra al iniciar sesión, así que el aviso sigue ahí aunque se recargue el login o se cambie de idioma.
- Cerrar sesión a mano no deja marca: el login sale sin aviso y se entra a Home.
- Todo el acceso a `sessionStorage` va en `try/catch`: sin él (modo privado estricto) solo se pierde el aviso.

**Decisión 3 — backend:**
- `verifyToken` separa el 401 de token caducado ("La sesión ha caducado. Vuelve a iniciar sesión.") del de token no válido, y ya no vuelca la traza al log.
- `next()` sale del `try`.
- Se corrige "autentificación" por "autenticación" en sus mensajes.

**No se cambia la duración del token (1 hora)**; es una decisión de producto aparte. Con este arreglo, que caduque ya no rompe nada: se vuelve a entrar y se sigue donde se estaba. Si se quisiera alargar (por ejemplo, a una jornada de 8 horas), bastaría cambiar `expiresIn` en `userControllers.js`.

**Verificación** (Playwright contra `hireflow_demo`, con tokens fabricados con `jsonwebtoken`):
- **Token caducado al abrir `#/calendar`:** lleva a `#/login` con el aviso, que sigue ahí tras recargar (F5) y sale en inglés al cambiar de idioma. Una contraseña incorrecta muestra "Email o contraseña incorrectos" sin perder el aviso ni entrar en bucle. Al entrar se vuelve a `#/calendar`.
- **Token firmado con otro secreto, que el cliente cree válido, al abrir `#/applications`:** el servidor responde 401, el token se borra y se va al login con el aviso. Al entrar se vuelve a `#/applications`.
- **Cerrar sesión a mano:** login sin aviso y, al entrar, a Home.
- Sin errores de página.

**Archivos afectados:** `frontend/js/api.js`, `frontend/js/screens/login.js`, `frontend/js/components/ui.js` (`infoBanner`), `frontend/style/components.css` (`.info-banner`), `frontend/js/i18n.js` (`auth.sessionExpired` en los 4 idiomas), `backend/middleware/authMiddleware.js`, `docs/api.md`, `docs/changeLog.md`.

---

## 026 — Asistente IA: preguntas sin plantillas, etiquetas traducidas y mejor reconocimiento en español

**Problema:**
- **Plantillas sin rellenar.** 13 de las 51 preguntas de entrevista de `ai_interview_questions` eran plantillas pensadas para rellenar a mano y se mostraban tal cual: "¿Cómo diseñarías [X concepto]?", "¿Cuál es la diferencia principal entre [Opción A] y [Opción B]?", "la herramienta X en lugar de la Y", "Nuestros valores son X e Y"... Algunas tenían además erratas: "Háblame de tí", "definirias", una comilla suelta al final y un paréntesis de cierre sin abrir. Se ve en el vídeo de la demo (0:32).
- **Etiquetas sin traducir.** Debajo de cada pregunta salían los códigos internos `category · difficulty` ("technical · advanced"), en inglés aunque la app estuviera en español. La guía de CV genérica mostraba "none" como tipo de empresa.
- **Peticiones razonables tratadas como fuera de tema.** Al probarlo apareció que el clasificador solo reconocía la intención "preguntas de entrevista" con frases concretas ("preguntas de entrevista", "qué me preguntarán"...), así que "preguntas personales", "preguntas de estrés" o "preguntas de cultura avanzadas" respondían "Solo puedo ayudarte con temas de búsqueda de empleo…". Y la dificultad solo se reconocía en masculino singular ("avanzado"), no "avanzadas" ni "básicas".

**Decisión 1 — reescribir las 13 preguntas como preguntas reales y genéricas**, que sirvan en cualquier sector sin que nadie las rellene, manteniendo su categoría, su dificultad y lo que evalúan. Por ejemplo:
- "¿Cómo diseñarías [X concepto]?" pasa a "Si tuvieras que diseñar desde cero el sistema o proceso con el que trabajabas en tu último puesto, ¿qué harías distinto y por qué?";
- "[error/fallo típico]" pasa a "Algo que funcionaba ayer ha dejado de funcionar hoy y nadie sabe por qué…".

Se aplica con `backend/database/migrations/026_ai_questions_sin_plantillas.sql` (en `hireflow` y `hireflow_demo`) y en `seed.sql` para instalaciones nuevas. Cada `UPDATE` va por id y exige un trozo del texto antiguo, así que reejecutarlo no hace nada.

**Detalle encontrado al migrar:** la collation de la base (`utf8mb4_0900_ai_ci`) no distingue tildes, así que para MySQL `'Háblame de tí' = 'Háblame de ti'` y el `UPDATE` de esa fila no hacía nada. Esas condiciones usan `BINARY`.

**Decisión 2 — etiquetas traducidas en el frontend** (`ai.category.*` y `ai.difficulty.*` en los 4 idiomas, por ejemplo "Técnica · avanzada" o "Culture fit · advanced"). Si llega un código desconocido se muestra tal cual, en vez de la clave de traducción. La guía con `company_type = "none"` (la genérica) ya no muestra esa línea.

**Decisión 3 — clasificador más tolerante en español** (`models/aiAssistant.js`):
- **"preguntas" (en plural) cuenta como intención de preguntas de entrevista.** El plural es a propósito: "tengo una pregunta sobre mi CV" sigue yendo a revisión de CV.
- **Categoría y dificultad se buscan por raíz** ("tecnic", "avanzad", "basic", "intermedi", "complej", "sencill"), para aceptar masculino, femenino y plural.
- **"medio" suelto pasa a "nivel medio"**, porque ahora el texto se busca por trozos y "medio ambiente" habría contado como dificultad intermedia.
- Se añade "situacional" a la categoría `behavioral`, que es como la muestra ahora la etiqueta traducida.

**Fuera de alcance — el asistente solo entiende español.** Al probar en inglés, la propia sugerencia "What will they ask me in the interview?" recibe la respuesta de "fuera de tema", **en español**. El clasificador solo tiene palabras clave en español, los mensajes del backend están solo en español y las preguntas del catálogo también. Estaba documentado como limitación (entrada 014), pero choca con que la app se anuncie en 4 idiomas y con que las sugerencias en inglés no funcionen. Queda como siguiente mejora.

**Verificación:**
- **Clasificador**, directamente con Node sobre 14 frases: todas las peticiones de preguntas se reconocen con su categoría y dificultad; "Revísame el CV", "¿Encajo con esta oferta?" y "cómo mejorar mi comunicación" siguen yendo a su intención; "¿qué tiempo hace hoy?" y "el medio ambiente en entrevistas" siguen siendo fuera de tema.
- **Navegador** (Playwright contra `hireflow_demo`): 7 peticiones distintas devuelven preguntas, sin ningún corchete y con las etiquetas en español ("Técnica · avanzada", "De presión · básica"...); la guía de CV ya no muestra "none"; sin errores de consola.

**Archivos afectados:** `backend/database/migrations/026_ai_questions_sin_plantillas.sql` (nuevo), `backend/database/seed.sql`, `backend/models/aiAssistant.js`, `frontend/js/screens/ai.js`, `frontend/js/i18n.js`, `docs/changeLog.md`.

---

## 027 — Una sola postulación por candidato y oferta

**Problema:** nada impedía postularse dos veces a la misma oferta. El frontend ocultaba el botón "Postularme" en las ofertas ya postuladas, pero:
- un doble clic en "Confirmar postulación" enviaba dos peticiones antes de que se redibujara la lista;
- con la app abierta en dos pestañas se podía postular desde ambas;
- por la API no había ningún límite.

La empresa veía entonces al mismo candidato repetido en Postulantes, con dos estados que se podían mover por separado.

**Decisión 1 — restricción en la base de datos, no una comprobación previa en el código.** `UNIQUE (user_id, job_offer_id)` en `applications` (`uq_application_user_job`). Una comprobación "¿ya existe?" antes del `INSERT` no evita la carrera del doble clic: las dos peticiones leen "no existe" y las dos insertan. La restricción sí: la segunda falla con `ER_DUP_ENTRY` y el controller la convierte en **409** "Ya te has postulado a esta oferta" (en vez del 400 genérico de `errorMiddleware`). En MySQL un índice `UNIQUE` admite varias filas con `NULL`, así que los seguimientos personales (sin `job_offer_id`) se pueden repetir, que es lo que se quiere.

**Decisión 2 — en el frontend**, el botón "Confirmar postulación" se desactiva mientras se envía, y un 409 se muestra con un texto traducido en los 4 idiomas (`jobs.alreadyAppliedError`) que dice dónde está la postulación ("Puedes verla en Mis postulaciones").

**Migración:** `backend/database/migrations/027_applications_unique_user_job.sql`, aplicada a `hireflow` y `hireflow_demo` tras comprobar que no había duplicados (la consulta de comprobación va en el propio archivo). `shema.sql` ya incluye la restricción.

**Verificación** (contra `hireflow_demo`):
- **curl:** dos peticiones simultáneas a la misma oferta dan 201 y 409, con una sola fila en la base; una tercera, 409. Dos seguimientos personales sin oferta, 201 y 201.
- **Playwright, doble clic:** doble clic real en "Confirmar postulación": una sola postulación nueva (de 3 a 4).
- **Playwright, dos pestañas:** con el diálogo abierto en una pestaña y la postulación hecha antes desde otra, la primera muestra "Ya te has postulado a esta oferta. Puedes verla en Mis postulaciones." y el botón vuelve a estar activo. Sin errores de página.

`hireflow_demo` se volvió a rellenar con `hireflow-datos.js` al terminar.

**Archivos afectados:** `backend/database/shema.sql`, `backend/database/migrations/027_applications_unique_user_job.sql` (nuevo), `backend/controllers/applicationControllers.js`, `frontend/js/screens/jobs.js`, `frontend/js/i18n.js`, `docs/api.md`, `docs/changeLog.md`.
