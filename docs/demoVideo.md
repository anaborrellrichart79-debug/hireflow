# Vídeo de demostración para LinkedIn

Guion de un vídeo de **75–90 segundos** que enseña HireFlow desde los dos lados: una candidata que busca empleo y una empresa que selecciona. Los datos son ficticios y se generan con un script, así que el vídeo se puede repetir cuantas veces haga falta.

---

## 1. Preparación (5 minutos)

1. **Genera los datos** el mismo día que vayas a grabar, **mejor de lunes a jueves**: las entrevistas se programan a partir de hoy, y así el panel muestra "Entrevistas esta semana".
   ```
   npm run demo:data
   ```
   Vacía y rellena la base de demostración (`hireflow_demo`). Tu base de desarrollo no se toca.
2. **Arranca la app con esos datos:**
   ```
   npm run demo:start
   ```
   y abre http://localhost:3000.
3. **Navegador**: una ventana limpia (perfil nuevo o modo incógnito), sin barra de marcadores, a **1920×1080** con zoom al **110 %**. Idioma de la app: español.
4. **Grabación**: OBS Studio, o en Windows **Win+Alt+R** (barra de juegos). Activa el resaltado del cursor si tu grabador lo tiene.
5. Ten preparadas **dos pestañas**, una con cada cuenta (en la segunda, entra después de cerrar sesión en la primera, o usa una ventana de incógnito aparte):

| Cuenta | Email | Contraseña |
|---|---|---|
| Candidata | `lucia.navarro@example.com` | `Demo2026!` |
| Empresa | `marta.gil@example.com` | `Demo2026!` |

> Si algo sale mal durante una toma (por ejemplo, has movido una tarjeta de más), vuelve a ejecutar `npm run demo:data` y todo vuelve al estado inicial.

### Qué hay en los datos

- **3 empresas de sectores distintos**: Marta Gil (Nexa Digital y Brisa Software, tecnología), Javier Ruiz (Clínica Mediterránea, sanidad) y Elena Martí (Estudio Brava y Atlas Retail, diseño y comercio).
- **13 ofertas** publicadas en días distintos, en Valencia, Alicante, Madrid, Barcelona y remoto, con salarios y contratos variados.
- **8 candidatos**, 7 con CV. Diego no lo ha rellenado (para enseñar ese aviso).
- **20 postulaciones** en todas las columnas del Kanban, **6 entrevistas** (4 esta semana), una candidata que no compartió el CV y otra que retiró su contacto.
- **Lucía Navarro** (la candidata del vídeo): CV completo, entrevista mañana a las 10:00 en Nexa Digital, un aviso "¡Actualizado por la empresa!" sin ver, y un 100 % de encaje con la oferta "Desarrolladora Frontend".

---

## 2. Guion

Los tiempos son orientativos. Entre acción y acción, **espera un segundo con el ratón quieto**: en LinkedIn el vídeo se ve pequeño y sin sonido, y los movimientos rápidos no se entienden.

| Tiempo | Pantalla | Qué hacer | Texto en pantalla (subtítulo) |
|---|---|---|---|
| 0:00–0:06 | **Inicio** (Lucía) | Muestra la tarjeta "Actualizaciones sin ver" y la próxima entrevista. | *HireFlow: tu búsqueda de empleo, en un solo sitio* |
| 0:06–0:18 | **Ofertas** | Escribe "front" en el buscador → filtra por "Valencia" → señala la tarjeta (empresa, salario, habilidades, "Publicada hace 3 días"). | *Busca ofertas por puesto, empresa o habilidad* |
| 0:18–0:28 | **Asistente IA** | Escribe "¿Encajo con la oferta Desarrolladora Frontend?" → 100 %, "Comparado con las habilidades de tu CV". | *Un asistente compara tu CV con cada oferta* |
| 0:28–0:38 | **Mis postulaciones** | Enseña el tablero y la etiqueta "¡Actualizado por la empresa!" → abre "Privacidad" en esa tarjeta y ciérralo con "Cancelar". | *Tú decides qué datos compartes con cada empresa* |
| 0:38–0:50 | **Inicio** (Marta, pestaña 2) | Panel: métricas, embudo "Cómo avanza el proceso" → clic en "Desarrolladora Frontend" de la tabla. | *Las empresas ven cómo avanza cada proceso* |
| 0:50–1:02 | **Postulantes** (Kanban filtrado) | "Ver perfil" de Lucía (contacto y CV) → **arrastra la tarjeta de Sara Iborra** de "Postulado" a "En entrevista". | *Arrastra a los candidatos por las fases* |
| 1:02–1:12 | **Calendario** | "Añadir entrevista" → "Sara Iborra — Desarrolladora Frontend", mañana a las 12:00, "Videollamada" → "Programar entrevista". | *Agenda entrevistas: el candidato las ve al momento* |
| 1:12–1:20 | **Idioma y móvil** | Cambia el selector a EN (la pantalla se traduce) → abre las herramientas de desarrollo en vista móvil (Ctrl+Shift+M). | *En 4 idiomas y en el móvil* |
| 1:20–1:26 | **404** | Escribe una dirección que no existe (`#/hola`): el maletín da tres vueltas y dice "Creo que no lo encuentro…". | *…y con un poco de humor* |
| 1:26–1:30 | Cierre | Pantalla final con el texto de abajo. | |

**Pantalla final** (una imagen o diapositiva de 3–4 segundos):

> **HireFlow** · Proyecto de portfolio
> Node.js · Express · MySQL · JavaScript sin frameworks
> 4 idiomas · Auditada con axe-core (WCAG 2.1 AA) · 127 pruebas automáticas
> github.com/anaborrellrichart79-debug/hireflow

### Si quieres un vídeo más corto (30–40 s)

Quédate con: Ofertas → Asistente (100 %) → Kanban de la empresa arrastrando una tarjeta → 404 del maletín → pantalla final.

---

## 3. Consejos

- **Subtítulos siempre**: la mayoría ve los vídeos de LinkedIn sin sonido. Los textos de la tabla están pensados para eso. CapCut o Clipchamp (incluido en Windows) los añaden fácilmente.
- **Formato**: horizontal 16:9 a 1080p, o **cuadrado 1:1**, que en el móvil ocupa más pantalla. Si lo haces cuadrado, graba la ventana a 1080×1080.
- **Primeros 3 segundos**: son los que deciden si alguien sigue viendo. Empieza con movimiento (el panel de la empresa o el Kanban quedan muy visuales).
- **Nada real en pantalla**: todos los emails son `@example.com` (un dominio reservado para ejemplos) y los teléfonos, del tipo 600 000 0xx.
- **Capturas** para el post o el README: `npm run demo:screenshots` las genera en `docs/screenshots/`.

---

## 4. Texto para el post de LinkedIn

> 🧳 Os presento **HireFlow**, el proyecto con el que he aprendido a construir una aplicación web completa, de principio a fin.
>
> Es una app para organizar la búsqueda de empleo, pensada para los dos lados:
> 🔹 **Candidatos**: buscan ofertas, se postulan, siguen sus procesos en un tablero y un asistente les dice si su CV encaja con cada oferta.
> 🔹 **Empresas**: publican ofertas, mueven a los candidatos por las fases arrastrando tarjetas y agendan entrevistas.
>
> Lo que más he cuidado:
> ✅ **Privacidad**: cada candidato decide, oferta a oferta, si comparte su contacto y su CV, y puede retirarlo cuando quiera.
> ✅ **Accesibilidad**: auditada con axe-core (WCAG 2.1 AA) y usable con teclado.
> ✅ **4 idiomas**: español, inglés, francés e italiano, incluidos los mensajes del servidor.
> ✅ **Calidad**: 127 pruebas automáticas que se ejecutan en cada cambio con GitHub Actions.
>
> 🛠️ Node.js · Express · MySQL · JavaScript sin frameworks · Playwright
>
> Y sí, cuando una página no existe, la mascota da tres vueltas buscándola 😄
>
> 👉 Código: github.com/anaborrellrichart79-debug/hireflow
>
> #DesarrolloWeb #JavaScript #NodeJS #Accesibilidad #Portfolio #OpenToWork
