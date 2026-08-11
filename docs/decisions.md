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