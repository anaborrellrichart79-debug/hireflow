# HireFlow — Roadmap

Última actualización: septiembre 2026

Qué falta y en qué orden tiene sentido hacerlo. Todo sale de lo que el propio proyecto ha dejado anotado como pendiente, fuera de alcance o limitación conocida (`decisions.md`, `projectStatus.md`, `api.md`, `Database.md`, `FRONTEND_DESIGN.md`). Cada punto cita su origen.

Estado de partida: el MVP está completo (ver `projectStatus.md`). Candidatos y empresas pueden registrarse, publicar y buscar ofertas, postularse con consentimiento, compartir su CV, gestionar entrevistas y estados, todo en 4 idiomas, con asistente y política de privacidad pública.

Prioridades: 🔴 bloquea publicar la app · 🟠 importante · 🟢 mejora.

---

## 1. Antes de publicar en Google Play

| | Tarea | Por qué | Origen |
|---|---|---|---|
| 🔴 | **Revisión legal de la Política de Privacidad** en los 4 idiomas | Es un borrador (lo dice la propia página); las traducciones fr/it también necesitan revisión | Entradas 017, 035, 037 |
| 🔴 | **Desplegar la app** en un servidor con HTTPS y una base de datos gestionada | Hoy solo corre en local; la política exige tráfico cifrado en producción | Entrada 017 (sección 9 de la política) |
| 🟢 | Cuando esté desplegada: **"Volver a HireFlow" también en la política de GitHub Pages** | Hoy solo aparece dentro de la app, porque en Pages no hay app a la que volver. Bastará con que el workflow ponga la URL de la app en `<meta name="hireflow-app">` en vez de quitarla | Entrada 039, petición de la usuaria |
| 🔴 | **Empaquetar para Android** (PWA con TWA, o app nativa/híbrida) | Google Play necesita una app, no una web | `googlePlayDataSafety.md` |
| 🟠 | Rellenar **Data Safety** en Play Console con el borrador ya preparado | | `googlePlayDataSafety.md` |
| 🟠 | Revisar las **4 vulnerabilidades moderadas** que marca `npm audit` en `backend/` | Detectadas al reinstalar dependencias | Sesión de septiembre 2026 |

---

## 2. Cuenta y seguridad

| | Tarea | Detalle | Origen |
|---|---|---|---|
| 🟠 | **Cambio de contraseña** — `PUT /users/me/password` | Pidiendo la contraseña actual. Fuera de `PUT /users/me` a propósito | `api.md` (Actualizar perfil propio) |
| 🟠 | **Cambio de email** | Exige volver a comprobar que es único y, idealmente, confirmarlo | `api.md` |
| 🟠 | **Confirmación de email al registrarse** | Permitiría que el registro deje de decir "El email ya está registrado" (hoy revela qué emails existen) | Entrada 020 |
| 🟠 | **Recuperar contraseña** por email | No existe; depende de tener envío de emails | — |
| 🟢 | **Rol `admin`** | Previsto en el esquema de roles; `requireRole` ya está preparado | `Database.md`, entrada 003 |
| 🟢 | Renovación del token sin volver a hacer login | Hoy el JWT dura 1 hora y la app avisa de que ha caducado | Entrada 025 |

---

## 3. Calidad del proyecto

| | Tarea | Detalle | Origen |
|---|---|---|---|
| ✅ | ~~Pruebas automáticas en el repositorio e integración continua~~ | Hecho: `tests/` + `.github/workflows/tests.yml` | Entrada 040 |
| 🟢 | **Ampliar las pruebas** a las pantallas anteriores al CV (ofertas, calendario, Kanban, panel de la empresa, asistente) | Hoy cubren la seguridad de la API y todo lo hecho desde la entrada 033 | Entrada 040 |
| 🟢 | Actualizar las acciones del workflow de Pages cuando salgan versiones para Node 24 | GitHub avisa de que Node 20 está obsoleto | Workflow `privacy-page.yml` |
| 🟢 | Datos de demo con fechas escalonadas | Todas las ofertas de demo salen como "Publicada hoy" | Entrada 030 |

---

## 4. Funcionalidad

### Candidatos
| | Tarea | Detalle | Origen |
|---|---|---|---|
| 🟠 | **Avisar a la empresa** cuando un candidato retira su consentimiento | Hoy la empresa simplemente deja de ver los datos | Entrada 034 |
| 🟢 | **Subir el CV en PDF** | Hoy el CV es texto + un enlace externo; el asistente tampoco lee archivos adjuntos | Entradas 015, 033 |
| 🟢 | **Contactos profesionales** | La tabla `contacts` existe en el esquema, sin API ni pantalla | `Database.md` |
| 🟢 | **Historial de notas** por postulación | La tabla `application_notes` existe; hoy se usa el campo único `applications.notes` | `Database.md` |

### Empresas
| | Tarea | Detalle | Origen |
|---|---|---|---|
| 🟠 | **Candidatos que encajan con una oferta** | El `job-match` actual va de candidato a oferta; falta el sentido inverso, que ya es posible porque los CV están en la BD | `FRONTEND_DESIGN.md` |
| 🟢 | Campo **"Urgencia"** de la oferta | Está en el formulario por fidelidad al diseño pero no se guarda: falta la columna | Entrada 011, `FRONTEND_DESIGN.md` |

### Calendario y avisos
| | Tarea | Detalle | Origen |
|---|---|---|---|
| 🟠 | **Notificaciones por email o push** | Hoy los avisos (cambio de estado) son solo dentro de la app | Entrada 017 |
| 🟢 | **Integración con Google Calendar** | Prevista desde el principio | `projectStatus.md` (Calendar), README |
| 🟢 | **Recordatorios y eventos propios** en el calendario | La API `/calendar` (`calendar_events`) existe, pero el calendario de la app solo muestra entrevistas | Entradas 009, 017 |

### Ofertas
| | Tarea | Detalle | Origen |
|---|---|---|---|
| 🟢 | **Importar ofertas** de LinkedIn o APIs de empleo | `job_offers.source` ya admite `linkedin` y `api` | README, `schema.sql` |
| 🟢 | Paginación del listado | Sin paginación en el MVP; `cardGrid` está preparado para añadirla | `FRONTEND_DESIGN.md` |

---

## 5. Asistente IA

| | Tarea | Detalle | Origen |
|---|---|---|---|
| 🟢 | **Comprensión de negación y contexto** en el encaje con ofertas | "No tengo experiencia en Docker" cuenta "docker" como coincidencia | Entrada 010, `api.md` |
| 🟢 | **Más contenido** en el catálogo | Más industrias, preguntas y habilidades, en los 4 idiomas | Entradas 014, 028 |
| ⚪ | LLM real | **Descartado** por decisión de la usuaria (coste y control). Solo se replantearía si cambia esa decisión | Entradas 010, 014 |

---

## 6. Interfaz

| | Tarea | Detalle | Origen |
|---|---|---|---|
| 🟢 | Modo oscuro | No existe; habría que revalidar el contraste de todos los colores | Entrada 032 |
| 🟢 | Mascota que esquive el contenido de verdad | Hoy se mueve entre posiciones fijas del borde | Entrada 014 |
| 🟢 | **Orden de encabezados en el Kanban** | Las columnas son `<h3>` sin `<h2>` antes; axe-core lo marca como buena práctica (no es WCAG) | Entrada 040 |

---

## 7. Documentación

| | Tarea | Origen |
|---|---|---|
| 🟢 | `AI_INSTRUCTIONS.md`: normas de trabajo para asistentes de IA en el proyecto (las tiene que definir la autora) | `projectStatus.md` |
| 🟢 | `SPRINT_PLAN_2MESES.md`: plan de sprints (lo tiene que definir la autora) | `projectStatus.md` |
