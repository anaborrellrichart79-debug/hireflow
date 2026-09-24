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
