# HireFlow - Frontend Design
**Versión:** 1.0
**Fuente:** Diseño en Canva (capturas 1-9) + maqueta en vídeo (`HireFlow-maqueta.mp4`, no reproducible por las herramientas usadas para redactar este documento — si algo aquí no coincide con el vídeo, el vídeo manda)
**Estado:** Aprobado, pendiente de implementación

Este documento pretende cumplir la regla citada de `AI_INSTRUCTIONS.md`: *"No comenzar una pantalla sin conocer previamente objetivo, flujo, componentes, datos recibidos, endpoints utilizados."* **Nota:** `AI_INSTRUCTIONS.md` está referenciado en `docs/decisions.md` y aquí, pero no existe en el repositorio — si existe en otro sitio, conviene añadirlo; si no, habría que recrearlo o dejar de citarlo.

Los textos de las capturas de Canva son orientativos. La maquetación (estructura, layout, componentes) es la definitiva.

---

# Principio de diseño

HireFlow tiene **una sola interfaz para ambos roles** (candidate / company). No se duplican pantallas: cada componente adapta su contenido según `req.user.role`. Esto evita duplicación de código en frontend y backend, siguiendo la filosofía de legibilidad, mantenimiento y consistencia ya aplicada en el backend (ver `docs/decisions.md`).

**Internacionalización (no estaba en el mockup de Canva, añadida por petición del usuario):** toda la interfaz existe en español (por defecto), inglés, francés e italiano, con un selector de idioma fijo en la topbar. Los mensajes que devuelve la API se quedan siempre en español. Detalle completo en `docs/decisions.md`, entrada 012.

---

# Paleta y estilo visual (observado en las capturas)

**Nota:** estos valores son una lectura aproximada de las capturas, no los códigos exactos del archivo Canva. Antes de fijarlos en el código (variables CSS / tokens de diseño), conviene extraer los valores reales del archivo de origen si está disponible; si no, estos sirven de partida.

- **Naranja principal** (botón CTA, letras "H"/"W" del logo, celdas de cabecera del calendario, avatar): tono cálido, aprox. `#F3A55C` – `#F6C990` según el elemento (el CTA es más saturado que el avatar/cabeceras).
- **Degradado de fondo** (`GradientContainer`, formulario, panel IA): de naranja (`#E8935A` aprox.) a crema muy pálido (`#FDF0DC` aprox.), siempre de izquierda a derecha.
- **Beige/tostado** (fondo de `Card`, cajas del panel IA, inputs del formulario): `#DCCBAE` – `#E4D4BB` aprox.
- **Texto:** negro para el logo (excepto la "H" y la "W", en naranja) y para los textos de labels/inputs; texto oscuro sobre fondo claro en el resto de componentes.
- **Formas:** esquinas muy redondeadas en general — botones tipo píldora (`border-radius` muy alto/50%) y cards con `border-radius` grande (~16-20px). Sin sombras visibles; el contraste se consigue por color de fondo, no por elevación.
- **Tipografía del logo:** sans-serif bold, mayúsculas, con las letras extremas ("H", "W") en color distinto al resto ("IREFLO") — ver `Header` más abajo.
- **Layout:** diseño mobile-first, contenido en una sola columna dentro de un contenedor de ancho fijo tipo móvil (~412px en las capturas); `CardGrid` es la única zona con 2 columnas.

---

# Layout base (presente en todas las pantallas)

```
┌─────────────────────────────────┐
│ (avatar)   HIREFLOW      (menú) │  ← Header
├─────────────────────────────────┤
│         [ btn-crear ]           │  ← CTA contextual
├─────────────────────────────────┤
│                                  │
│      contenido de la pantalla   │
│                                  │
└─────────────────────────────────┘
```

## Componente: `Header`
- Avatar circular ("usuario") → abre perfil/config
- Logo **H**IREFLO**W** centrado — "H" y "W" en naranja, "IREFLO" en negro (confirmado en las 9 capturas, es consistente en todas)
- Icono menú hamburguesa (der) → despliega navegación
- Fijo en todas las pantallas (layout compartido, no se repite por página)

## Componente: `PrimaryButton` (pill naranja)
- Usado como CTA principal bajo el header
- Texto y acción cambian según pantalla/rol:
  - Home → abre menú de secciones
  - Listados → "crear" (nueva postulación / nueva oferta, según rol)
  - Formulario → "crear" (submit)

## Componente: `GradientContainer`
- Fondo degradado naranja→crema que envuelve los listados en grid
- Contenedor visual, sin lógica propia

---

# Inventario de pantallas

## 1. Home / Empty State
**Captura:** 1 de 9 — header + `btn-crear`, resto de la pantalla completamente en blanco (sin ilustración ni texto), confirma que es un estado vacío real, no un placeholder de la captura.

**Objetivo:** pantalla inicial antes de interactuar con el menú, y estado vacío reutilizable para cualquier listado sin datos.

**Flujo:**
- Al entrar por primera vez o sin selección de menú → contenido vacío bajo header + CTA
- Cualquier listado (postulaciones, ofertas, candidatos) sin resultados → mismo componente vacío, con mensaje contextual

**Componentes:** `Header`, `PrimaryButton`, `EmptyState` (mensaje + posible ilustración/icono — en la captura no hay ninguno, a decidir en implementación si se añade)

**Datos:** ninguno (o conteo = 0 desde el endpoint correspondiente)

**Endpoints:** el mismo que la pantalla de destino (`GET /applications`, `GET /jobs`, etc.) — el `EmptyState` se muestra cuando la respuesta viene vacía, no es una ruta propia.

---

## 2. Formulario (CV / Oferta laboral)
**Captura:** 2 de 9 — ejemplo mostrado en modo "Crear oferta laboral" (company).

**Objetivo:** un único componente de formulario reutilizado en dos contextos según rol.

**Flujo:**
- Candidate → completa/edita su perfil-CV (skills, experiencia, etc.)
- Company → crea/edita una oferta laboral (nombre empresa, descripción, tipo contrato, jornada, salario, urgencia)

**Componentes:** `Header`, `PrimaryButton`, `FormField` (input texto/textarea), `PillCheckboxGroup` (tipo contrato, jornada, salario — selección tipo pill), `UrgencySlider` (5 casillas numeradas 1-5, no un slider continuo — así aparece en la captura), `SubmitButton`

**Contenido de ejemplo visto en la captura (orientativo, no definitivo):**
- Campos de texto: "Nombre de la empresa", "Información de la empresa", "OFERTA laboral"
- `Tipo de contrato`: Indefinido / Corta duración / Por horas / Nueva opción
- `Tipo de jornada`: Completa / Media Jornada / A convenir
- `Salario`: Mínimo interprofesional / 1600€ brutos / 1900€ brutos / 1600€ brutos / Según experiencia — **la captura repite "1600€ brutos" dos veces**, probablemente un desliz del mockup; en implementación usar un tercer tramo salarial distinto (p. ej. 2200€ brutos) en su lugar
- `Urgencia`: escala 1-5

**Datos recibidos:**
- Candidate: `{ skills, experience, bio, ... }` → tabla `users` (extender con perfil) o tabla `user_profiles` (ya existe en el schema, sin CRUD backend todavía — ver `docs/decisions.md`, entrada 010)
- Company: `{ company_name, company_info, offer_title, contract_type, work_schedule, salary, urgency }` → tabla `job_offers`

**Endpoints:**
- Candidate: `PUT /users/me` (perfil básico, ya implementado) — los campos de CV extendido (`skills`, `experience`, etc.) necesitan el CRUD de `user_profiles`, que todavía no existe en el backend
- Company: `POST /jobs` / `PUT /jobs/:id` (ya implementados) — **nota:** `job_offers` no tiene columna `urgency` en el schema actual (`schema.sql`); si se quiere persistir la urgencia habrá que añadir la columna y registrar la decisión en `docs/decisions.md` antes de tocar el schema

**Nota de arquitectura:** el componente `Form` recibe un prop `mode: "profile" | "job_offer"` que determina qué campos renderiza y a qué endpoint hace submit. Un solo componente, no dos.

---

## 3. Listado — Ofertas / Candidatos (`CardGrid`)
**Captura:** 3 de 9 — grid 2 columnas, cards "postulaciones" (contenido de ejemplo genérico en la captura).

**Objetivo:** grid de 2 columnas reutilizado en varias variantes de contenido (ver pantallas 5, 6 y 7, que comparten este mismo componente).

**Flujo:**
- Candidate → ve ofertas laborales disponibles para postularse
- Company → ve candidatos cuyo perfil encaja con sus ofertas (resultado de `job-match` IA o filtro simple)

**Comportamiento de layout:** grid estándar 2 columnas (`grid-template-columns: 1fr 1fr`), las cards se van colocando de 2 en 2, fila por fila. Sin paginación visual en el MVP inicial — si el volumen de datos lo requiere más adelante, se añade paginación sin tocar el componente `CardGrid`.

**Componentes:** `Header`, `PrimaryButton`, `GradientContainer`, `CardGrid`, `Card`

**Datos por card:** título oferta / nombre-resumen candidato, resumen corto

**Endpoints:** `GET /jobs` (candidate, ya implementado) · endpoint de "candidatos que encajan con una oferta" (company) — **no existe todavía**, se puede resolver con `POST /ai/job-match` (ya implementado, ver `docs/decisions.md` entrada 010) invertido — dado un `job_offer_id`, listar candidatos cuyo perfil declarado encaja — pero eso requiere que existan perfiles de candidato consultables (`user_profiles`, sin CRUD aún). Documentar en `api.md` antes de implementar.

---

## 4. Calendario semanal
**Captura:** 4 de 9 — tabla lunes a sábado, filas vacías (franjas horarias sin datos de ejemplo).

**Objetivo:** ver entrevistas agendadas.

**Flujo:**
- Candidate → entrevistas de sus propias postulaciones
- Company → entrevistas que tiene que realizar

**Componentes:** `Header`, `PrimaryButton`, `WeekCalendar` (tabla lunes-sábado, filas = franjas horarias o eventos)

**Datos:** `interviews` filtradas por usuario/rol, con fecha/hora (`GET /interviews`, ya implementado — filtra por propiedad heredada de `applications`, ver `docs/decisions.md` entrada 005). También aplica a `calendar_events` (`GET /calendar`, ya implementado, entrada 009) si se quiere mostrar en la misma vista eventos que no son entrevistas (recordatorios, etc.)

**Endpoints:** `GET /interviews` y opcionalmente `GET /calendar` — ambos ya implementados. Integración real con Google Calendar sigue siendo trabajo futuro (fuera del alcance actual del backend).

---

## 5. Listado — Estado de postulación (`CardGrid`, variante "estado")
**Captura:** 5 de 9 — mismas cards que la pantalla 3, con "ESTADO" añadido al texto de ejemplo.

**Objetivo:** ver en qué fase está cada postulación.

**Flujo:**
- Candidate → sus postulaciones con su `status` (wishlist/applied/interview/offer/rejected)
- Company → candidatos en proceso con su fase actual

**Componentes:** `Header`, `PrimaryButton`, `GradientContainer`, `CardGrid`, `Card` + `StatusBadge`

**Datos:** `applications.status` por card

**Endpoints:** `GET /applications` (ya implementado)

---

## 6. Listado — Notas/Contactos (`CardGrid`, variante "notas")
**Captura:** 6 de 9 — mismas cards, con "NOTAS/CONTACTOS" añadido al texto de ejemplo.

**Objetivo:** misma pantalla que la 5, mostrando además notas/contacto añadidos por el usuario.

**Flujo:** idéntico a la pantalla 5, con el campo `notes` visible/editable en la card

**Componentes:** los mismos que pantalla 5 + `NotesField` (editable inline o vía modal)

**Datos:** `applications.notes`

**Endpoints:** `PUT /applications/:id` (ya implementado — recuerda que `status` es obligatorio en este endpoint incluso si solo se edita `notes`, ver `docs/decisions.md` entrada 008)

**Nota:** pantallas 5 y 6 podrían ser **una sola vista con toggle** (estado ↔ notas) en vez de dos pantallas separadas — decisión de implementación de frontend, no cambia el modelo de datos ni los endpoints.

---

## 7. Listado — Ofertas creadas (`CardGrid`, variante "ofertas propias")
**Capturas:** 7 y 8 de 9 — dos capturas casi idénticas ("Ofertas Laborales" x6), correspondientes a las dos variantes de rol descritas abajo (mismo componente visual, acción distinta).

**Objetivo:** resultado de las ofertas ya publicadas (tras usar el Formulario de pantalla 2 en modo empresa).

**Flujo:**
- Company → gestiona/edita sus ofertas publicadas
- Candidate → las ve para postularse (comparte componente con pantalla 3, mismo dato distinto contexto de acción: "editar" vs "postularme")

**Componentes:** `Header`, `PrimaryButton`, `GradientContainer`, `CardGrid`, `Card` (con acción contextual según rol: botón "editar" o botón "postularme")

**Endpoints:** `GET /jobs` (ya implementado); filtrado por `created_by_user` para la vista de company (el endpoint actual no filtra por `created_by_user` en el backend, se filtraría en cliente sobre `GET /jobs` o se añade query param — a decidir en implementación).

---

## 8. Asistente IA
**Captura:** 9 de 9 — sidebar izquierdo con dos cajas apiladas ("explicación del sistema", "documentación aportada"), panel central grande ("contestación de la IA"), barra de input inferior ("preguntar a la IA") con botones "import" y "send".

**Objetivo:** asistente especializado en búsqueda de empleo, compartido por ambos roles con comportamiento adaptado.

**Layout:** 3 zonas
- Sidebar izq: "explicación del sistema" (qué puede hacer) + "documentación aportada" (archivos importados)
- Panel central: respuesta de la IA
- Barra inferior: input de pregunta + botón `import` (adjuntar CV/oferta) + botón `send`

**Flujo por rol y función** (mapeo a los 4 endpoints de IA, ya implementados — ver `docs/decisions.md` entrada 010):

| Función | Candidate | Company |
|---|---|---|
| `job-match` | Qué ofertas encajan con su perfil | Qué candidatos encajan con su oferta |
| `cv-review` | Revisión/mejora de su CV | Revisión de si la oferta está bien planteada |
| `interview-questions` | Qué le pueden preguntar (prepararse) | Qué preguntar al candidato (entrevistar) |
| `interview-feedback` | Cómo le fue en la entrevista | Feedback estructurado sobre el candidato |

**Componentes:** `Header`, `PrimaryButton`, `AIPanel`, `AISidebar`, `ChatMessage`, `ImportButton`, `ChatInput`

**Datos:** historial de conversación (posible tabla futura `ai_history`, no existe todavía en el schema), documento importado (CV u oferta, según rol)

**Endpoints:** `POST /ai/job-match`, `POST /ai/cv-review`, `POST /ai/interview-questions`, `POST /ai/interview-feedback` — **ya implementados**, pero con una diferencia importante respecto a lo previsto aquí: son consultas sobre catálogo (`ai_resume_guides`, `ai_interview_questions`, `ai_skill_improvement`), no un LLM real con "prompt interno" construido a partir del rol. Antes de conectar esta pantalla, decidir si:
- (a) se mantienen como están (respuestas de catálogo, sin conversación libre — el `ChatInput`/`ImportButton` tendrían que traducirse a los parámetros concretos de cada endpoint, por ejemplo `import` de un CV no tiene un endpoint que lo procese hoy), o
- (b) se amplía el backend con un LLM real que sí soporte conversación libre y adjuntar documentos.

Esto es una decisión pendiente que afecta directamente a cómo se implementa esta pantalla — no se ha tomado todavía, se deja registrada aquí para decidirla antes de picar código de esta pantalla en concreto (regla de `AI_INSTRUCTIONS.md` citada al principio).

**Decisión de arquitectura ya tomada (ver `docs/decisions.md`, entrada 010):**
- Problema: ¿un asistente por rol o uno compartido?
- Alternativas: (a) pantallas/endpoints separados candidate vs company, (b) un único componente y endpoint condicionado por rol
- Decisión: (b)
- Motivo: evita duplicación de UI y de lógica; el rol ya está disponible en `req.user.role` vía JWT; consistente con el resto de la app (`Form`, `CardGrid`)

---

# Mapa de componentes → dónde se usan

| Componente | Pantallas |
|---|---|
| `Header` | Todas |
| `PrimaryButton` | Todas |
| `GradientContainer` | 3, 5, 6, 7 |
| `CardGrid` + `Card` | 3, 5, 6, 7 |
| `EmptyState` | 1 (y fallback de cualquier listado vacío) |
| `Form` (mode: profile/job_offer) | 2 |
| `PillCheckboxGroup`, `UrgencySlider` | 2 |
| `WeekCalendar` | 4 |
| `StatusBadge` | 5 |
| `NotesField` | 6 |
| `AIPanel`, `AISidebar`, `ChatMessage`, `ChatInput`, `ImportButton` | 8 |

Estructura resultante en `frontend/components/`:
```
components/
  Header/
  PrimaryButton/
  GradientContainer/
  CardGrid/
  Card/
  EmptyState/
  Form/
  PillCheckboxGroup/
  UrgencySlider/
  WeekCalendar/
  StatusBadge/
  NotesField/
  ai/
    AIPanel/
    AISidebar/
    ChatMessage/
    ChatInput/
    ImportButton/
```

---

# Pendiente de definir en implementación (no bloquea el inicio)

- Endpoint exacto para "candidatos que encajan con una oferta" (pantalla 3, vista company) — documentar en `api.md` antes de implementarlo (ver nota en pantalla 3)
- Si pantallas 5 y 6 son una vista con toggle o dos rutas — decisión de UI, sin impacto en backend
- Estructura de `ai_history` (tabla) si se quiere persistir conversaciones del Asistente IA — documentar en `Database.md` antes de crearla
- CRUD de `user_profiles` — necesario para el modo "profile" del `Form` (pantalla 2, candidate) y para que `job-match` compare contra un perfil guardado en vez de exigir las skills en cada petición (ver `docs/decisions.md`, entrada 010)
- Columna `urgency` en `job_offers` (o tabla aparte) si se quiere persistir el campo "Urgencia" del formulario — no existe en el schema actual
- Decidir el alcance real de la pantalla 8 (Asistente IA): catálogo tal como está implementado, o ampliar a un LLM real con conversación libre y adjuntar documentos (ver nota en pantalla 8)

---

# Próximo paso

Diseño frontend cerrado (este documento). El backend previsto para el MVP ya está completo (Users, Companies, Job Offers, Applications, Interviews, Calendar, AI basada en catálogo, manejo de errores, validaciones — ver `docs/projectStatus.md`). El siguiente paso es empezar la implementación del frontend por la pantalla 1 (Home/Empty State) y el layout base (`Header`, `PrimaryButton`), ya que son compartidos por el resto de pantallas.
