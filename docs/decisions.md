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