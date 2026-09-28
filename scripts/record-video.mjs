// Graba el vídeo de demostración (~100 s, 1080p) siguiendo el guion de
// docs/demoVideo.md (ver docs/decisions.md, entrada 045).
//
//   npm run demo:data     (primero: datos de demostración frescos)
//   npm run demo:video    (graba; deja el vídeo en demo-output/)
//
// Playwright maneja la app como una persona y graba la pantalla. Encima se
// pintan subtítulos (en LinkedIn casi todo se ve sin sonido), un cursor
// visible (el vídeo de Playwright no graba el ratón), portada, transición,
// vista de móvil y pantalla final. Con FFMPEG_PATH (un ffmpeg con libx264)
// se convierte a MP4 H.264, el formato que acepta LinkedIn; sin él, se queda
// en WebM.
//
// La grabación CAMBIA los datos de demostración (arrastra una tarjeta y
// agenda una entrevista): vuelve a ejecutar "npm run demo:data" después.
import { chromium } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "demo-output");
const RAW = path.join(OUT, "raw");
const DEMO_DB = process.env.DEMO_DB_NAME || "hireflow_demo";
const PASSWORD = "Demo2026!";
const FFMPEG = process.env.FFMPEG_PATH;
fs.mkdirSync(RAW, { recursive: true });

// ---------------------------------------------------------------------------
// Servidor con los datos de demostración
// ---------------------------------------------------------------------------
const port = await new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, () => { const p = s.address().port; s.close(() => resolve(p)); });
});
const server = spawn(process.execPath, ["server.js"], { cwd: path.join(ROOT, "backend"), env: { ...process.env, DB_NAME: DEMO_DB, PORT: String(port) }, stdio: "ignore" });
const APP = `http://localhost:${port}`;
for (let i = 0; i < 80; i++) {
    try { await fetch(`${APP}/privacy.html`); break; } catch { await new Promise((r) => setTimeout(r, 250)); }
}
const login = async (email) => {
    const res = await fetch(`${APP}/api/users/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: PASSWORD }) });
    const data = await res.json();
    if (!data.token) throw new Error(`No se pudo entrar como ${email}: ¿has ejecutado npm run demo:data?`);
    return data.token;
};
const TOKENS = { lucia: await login("lucia.navarro@example.com"), marta: await login("marta.gil@example.com") };

// ---------------------------------------------------------------------------
// Capa de "producción" que se inyecta en cada carga: subtítulos, cursor,
// tarjetas a pantalla completa y marco de móvil. Solo en la ventana
// principal (en el iframe del móvil solo se oculta la mascota).
// ---------------------------------------------------------------------------
const OVERLAY = () => {
    const ready = (fn) => (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn) : fn());
    ready(() => {
        const css = document.createElement("style");
        css.textContent = `
            #mascot-root { display: none !important; }
            #demo-cursor { position: fixed; z-index: 2147483647; width: 26px; height: 26px; pointer-events: none;
                left: 640px; top: 400px; transform: translate(-3px, -2px); transition: opacity .2s; }
            #demo-ripple { position: fixed; z-index: 2147483646; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%;
                border: 3px solid #d98f3f; pointer-events: none; opacity: 0; }
            #demo-ripple.on { animation: demo-ripple .45s ease-out; }
            @keyframes demo-ripple { from { opacity: .9; transform: scale(.3); } to { opacity: 0; transform: scale(1.4); } }
            #demo-caption { position: fixed; z-index: 2147483645; left: 50%; bottom: 34px; transform: translate(-50%, 12px);
                max-width: 86%; padding: 12px 26px; border-radius: 999px; background: rgba(34, 24, 14, .88); color: #fff;
                font: 700 26px/1.25 Lato, Roboto, sans-serif; text-align: center; pointer-events: none; opacity: 0;
                transition: opacity .35s, transform .35s; box-shadow: 0 8px 24px rgba(0,0,0,.25); }
            #demo-caption.on { opacity: 1; transform: translate(-50%, 0); }
            #demo-card { position: fixed; inset: 0; z-index: 2147483644; display: flex; flex-direction: column; align-items: center;
                justify-content: center; gap: 14px; text-align: center; color: #2a2a2a; font-family: Lato, Roboto, sans-serif;
                background: radial-gradient(circle at 50% 35%, #fff9e4 0%, #f8d9ad 60%, #ebad64 100%);
                opacity: 0; pointer-events: none; transition: opacity .45s; }
            #demo-card.on { opacity: 1; }
            #demo-card img { width: 150px; filter: drop-shadow(0 8px 14px rgba(43,29,18,.3)); }
            #demo-card h1 { margin: 0; font-size: 64px; letter-spacing: 3px; }
            #demo-card h1 span { color: #a8621a; }
            #demo-card p { margin: 0; font-size: 26px; max-width: 900px; }
            #demo-card .small { font-size: 20px; color: #4f4f4f; }
            #demo-phone { position: fixed; z-index: 2147483643; inset: 0; display: flex; align-items: center; justify-content: center;
                background: rgba(255, 249, 228, .92); opacity: 0; pointer-events: none; transition: opacity .4s; }
            #demo-phone.on { opacity: 1; }
            #demo-phone .frame { width: 270px; height: 554px; margin-bottom: 84px; border-radius: 40px; background: #1d1d1f; padding: 14px;
                box-shadow: 0 20px 50px rgba(0,0,0,.35); }
            #demo-phone .screen { width: 242px; height: 526px; border-radius: 28px; overflow: hidden; background: #fff; }
            #demo-phone iframe { width: 390px; height: 849px; border: 0; transform: scale(.62); transform-origin: 0 0; }
        `;
        document.head.append(css);
        if (window.top !== window) return; // dentro del móvil: solo ocultar la mascota

        const make = (id, html = "") => { const el = document.createElement("div"); el.id = id; el.innerHTML = html; document.body.append(el); return el; };
        const cursor = make("demo-cursor", `<svg viewBox="0 0 24 24" width="26" height="26"><path d="M3 2l7 19 2.6-7.4L20 11z" fill="#fff" stroke="#2a2a2a" stroke-width="1.6" stroke-linejoin="round"/></svg>`);
        const ripple = make("demo-ripple");
        const caption = make("demo-caption");
        const card = make("demo-card");
        const phone = make("demo-phone");

        const saved = JSON.parse(sessionStorage.getItem("demo-cursor") || "null");
        if (saved) { cursor.style.left = `${saved.x}px`; cursor.style.top = `${saved.y}px`; }
        const move = (x, y) => {
            cursor.style.left = `${x}px`; cursor.style.top = `${y}px`;
            sessionStorage.setItem("demo-cursor", JSON.stringify({ x, y }));
        };
        // Un <dialog> abierto se dibuja en la capa superior del navegador, por
        // encima de cualquier z-index: mientras haya uno, el cursor, el efecto
        // del clic y los subtítulos se meten dentro para seguir viéndose.
        const layer = () => document.querySelector("dialog[open]") || document.body;
        const lift = () => { const target = layer(); for (const el of [cursor, ripple, caption]) if (el.parentNode !== target) target.append(el); };
        new MutationObserver(lift).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"], childList: true });
        document.addEventListener("mousemove", (e) => move(e.clientX, e.clientY), true);
        document.addEventListener("dragover", (e) => move(e.clientX, e.clientY), true);
        document.addEventListener("mousedown", (e) => {
            ripple.style.left = `${e.clientX}px`; ripple.style.top = `${e.clientY}px`;
            ripple.classList.remove("on"); void ripple.offsetWidth; ripple.classList.add("on");
        }, true);

        const showCard = (html) => { card.innerHTML = html; card.classList.add("on"); sessionStorage.setItem("demo-card", html); };
        // Si se recarga con una tarjeta puesta (cambio de usuario), sigue puesta
        const pending = sessionStorage.getItem("demo-card");
        if (pending) { card.style.transition = "none"; showCard(pending); requestAnimationFrame(() => { card.style.transition = ""; }); }

        window.__demo = {
            caption: (text) => { caption.textContent = text; caption.classList.add("on"); },
            hideCaption: () => caption.classList.remove("on"),
            card: showCard,
            hideCard: () => { card.classList.remove("on"); sessionStorage.removeItem("demo-card"); },
            phone: (url) => { phone.innerHTML = `<div class="frame"><div class="screen"><iframe src="${url}" title="HireFlow en el móvil"></iframe></div></div>`; phone.classList.add("on"); },
            hidePhone: () => phone.classList.remove("on"),
            cursor: (visible) => { cursor.style.opacity = visible ? "1" : "0"; }
        };
    });
};

// ---------------------------------------------------------------------------
// Grabación
// ---------------------------------------------------------------------------
const browser = await chromium.launch();
const context = await browser.newContext({
    // Playwright graba al tamaño de la ventana (no aumenta la resolución con
    // deviceScaleFactor): se graba a 1280x720 y ffmpeg lo escala a 1080p.
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: RAW, size: { width: 1280, height: 720 } },
    // Solo para esta herramienta: la capa de subtítulos usa CSS en línea, que
    // la CSP de la app bloquea (y debe seguir bloqueando para los usuarios).
    bypassCSP: true,
    locale: "es-ES"
});
await context.addInitScript(OVERLAY);
const page = await context.newPage();
const startedAt = Date.now();

const pause = (ms) => page.waitForTimeout(ms);
const demo = (fn, arg) => page.evaluate(([f, a]) => window.__demo[f](a), [fn, arg]);
const caption = async (text) => { await demo("caption", text); };
const moveTo = async (locator, steps = 22) => {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps });
};
const click = async (locator) => {
    await moveTo(locator);
    await pause(180);
    await locator.click();
};
const type = (locator, text) => locator.pressSequentially(text, { delay: 75 });
const openMenuItem = async (name) => {
    await click(page.getByRole("button", { name: /Abrir menú|Open menu/ }));
    await pause(500);
    await click(page.locator("#nav-drawer").getByRole("link", { name, exact: true }));
    await pause(700);
};
const card = (html) => demo("card", html);
const LOGO = `<img src="assets/mascota-soporte.svg" alt=""><h1><span>H</span>IREFLO<span>W</span></h1>`;

// Día hábil siguiente, para la entrevista que se agenda en el vídeo
const nextBusinessDay = () => { const d = new Date(); do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6); return d; };
const pad = (n) => String(n).padStart(2, "0");
const d = nextBusinessDay();
const interviewAt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T12:00`;

let trimStart = 0;
try {
    // --- Portada ------------------------------------------------------------
    await page.goto(`${APP}/`);
    await page.evaluate(([t]) => { localStorage.setItem("hireflow_token", t); localStorage.setItem("hireflow_lang", "es"); sessionStorage.clear(); }, [TOKENS.lucia]);
    await page.goto(`${APP}/#/`);
    await card(`${LOGO}<p>Tu búsqueda de empleo, en un solo sitio</p><p class="small">Para candidatos y para empresas</p>`);
    trimStart = (Date.now() - startedAt) / 1000;
    await page.locator(".stat-card").first().waitFor();
    await pause(5200);
    await demo("hideCard");
    await pause(500);

    // --- 1. Inicio de la candidata -----------------------------------------
    await caption("Lucía busca empleo: de un vistazo, sus novedades");
    await pause(600);
    await moveTo(page.locator(".stat-card", { hasText: "Actualizaciones sin ver" }));
    await pause(1600);
    await moveTo(page.locator(".stat-card", { hasText: "Próxima entrevista" }));
    await pause(2000);

    // --- 2. Ofertas ---------------------------------------------------------
    await click(page.locator(".quick-link-card", { hasText: "Ofertas" }));
    await page.locator(".job-card").first().waitFor();
    await caption("Busca ofertas por puesto, empresa o habilidad");
    await pause(900);
    await click(page.locator(".job-search"));
    await type(page.locator(".job-search"), "front");
    await pause(700);
    await click(page.getByRole("combobox", { name: "Todas las ubicaciones" }));
    await page.getByRole("combobox", { name: "Todas las ubicaciones" }).selectOption("Valencia");
    await pause(900);
    const jobCard = page.locator(".job-card", { hasText: "Desarrolladora Frontend" });
    await moveTo(jobCard.locator(".salary-chip"));
    await pause(1100);
    await moveTo(jobCard.locator(".skill-chip").nth(1));
    await pause(1800);

    // --- 3. Asistente -------------------------------------------------------
    await openMenuItem("Asistente IA");
    await caption("Un asistente compara su CV con cada oferta");
    const input = page.getByPlaceholder("Escribe tu pregunta...");
    await click(input);
    await type(input, "¿Encajo con la oferta Desarrolladora Frontend?");
    await pause(300);
    await input.press("Enter");
    await page.getByText("Comparado con las habilidades de tu CV.").waitFor();
    await moveTo(page.getByText(/Compatibilidad: 100%/));
    await pause(3000);

    // --- 4. Mis postulaciones ----------------------------------------------
    await openMenuItem("Mis postulaciones");
    await caption("Sigue sus procesos y decide qué datos comparte");
    const appCard = page.locator(".kanban-card", { hasText: "Desarrolladora Frontend" });
    await moveTo(appCard.getByText("¡Actualizado por la empresa!"));
    await pause(1300);
    await click(appCard.getByRole("button", { name: /^Privacidad/ }));
    await page.locator("dialog.hf-dialog").waitFor();
    await pause(2600);
    await click(page.locator("dialog.hf-dialog").getByRole("button", { name: "Cancelar" }));
    await pause(500);
    await demo("hideCaption");

    // --- Transición: la empresa --------------------------------------------
    await card(`${LOGO}<p>Y ahora, desde el lado de la empresa</p>`);
    await pause(900);
    await page.evaluate(([t]) => localStorage.setItem("hireflow_token", t), [TOKENS.marta]);
    await page.goto(`${APP}/#/`);
    await page.locator(".funnel-row").first().waitFor();
    await pause(1300);
    await demo("hideCard");
    await pause(500);

    // --- 5. Panel de la empresa --------------------------------------------
    await caption("Marta ve cómo avanza cada proceso de selección");
    await moveTo(page.locator(".dash-kpis .stat-card").nth(1));
    await pause(900);
    await moveTo(page.locator(".dash-kpis .stat-card").nth(2));
    await pause(900);
    await moveTo(page.locator(".funnel-row").nth(1));
    await pause(2800);
    await click(page.locator(".dash-table").getByRole("button", { name: "Desarrolladora Frontend" }));
    await page.locator(".kanban-card").first().waitFor();

    // --- 6. Kanban ----------------------------------------------------------
    await caption("Ve el contacto y el CV, solo si el candidato los comparte");
    const luciaCard = page.locator(".kanban-card", { hasText: "Lucía Navarro" });
    await click(luciaCard.getByRole("button", { name: "Ver perfil" }));
    await luciaCard.locator(".applicant-cv").waitFor();
    await pause(700);
    await page.mouse.wheel(0, 260);
    await pause(2400);
    await page.mouse.wheel(0, -260);
    await pause(500);
    await click(luciaCard.getByRole("button", { name: "Ocultar perfil" }));
    await caption("…y mueve a los candidatos arrastrando las tarjetas");
    const saraCard = page.locator(".kanban-card", { hasText: "Sara Iborra" });
    await moveTo(saraCard.locator("h4"));
    await pause(400);
    await page.mouse.down();
    const target = page.locator('section.kanban-column[aria-label="En entrevista"]');
    const tbox = await target.boundingBox();
    await page.mouse.move(tbox.x + tbox.width / 2, tbox.y + 90, { steps: 35 });
    await pause(250);
    await page.mouse.up();
    await page.getByText("Estado actualizado. El candidato lo verá reflejado.").waitFor();
    await pause(2800);

    // --- 7. Calendario ------------------------------------------------------
    await openMenuItem("Calendario");
    await caption("Agenda entrevistas: el candidato las ve al momento");
    await click(page.getByRole("button", { name: "Añadir entrevista" }));
    const dialog = page.locator("dialog.hf-dialog");
    await dialog.waitFor();
    await click(dialog.getByRole("combobox"));
    await dialog.getByRole("combobox").selectOption({ label: "Sara Iborra — Desarrolladora Frontend" });
    await pause(500);
    await click(dialog.locator("input[type=datetime-local]"));
    await dialog.locator("input[type=datetime-local]").fill(interviewAt);
    await pause(400);
    await click(dialog.getByPlaceholder("Lugar o enlace"));
    await type(dialog.getByPlaceholder("Lugar o enlace"), "Videollamada");
    await pause(300);
    await click(dialog.getByRole("button", { name: "Programar entrevista" }));
    await page.getByText("Entrevista programada correctamente").waitFor();
    await moveTo(page.locator(".week-event", { hasText: "Sara Iborra" }));
    await pause(2500);

    // --- 8. Idiomas ---------------------------------------------------------
    await caption("En español, inglés, francés e italiano…");
    await click(page.locator("#lang-switcher"));
    await page.locator("#lang-switcher").selectOption("fr");
    await pause(1900);
    await page.locator("#lang-switcher").selectOption("en");
    await pause(1900);

    // --- 9. Móvil -----------------------------------------------------------
    await caption("…y en el móvil");
    await demo("cursor", false);
    await demo("phone", `${APP}/#/`);
    await pause(6400);
    await demo("hidePhone");
    await pause(400);

    // --- 10. 404 ------------------------------------------------------------
    await caption("…y con un poco de humor");
    await page.evaluate(() => localStorage.setItem("hireflow_lang", "es"));
    await page.goto(`${APP}/?r=1#/hola`);
    await demo("caption", "…y con un poco de humor");
    await page.locator(".lost-bubble.visible").waitFor({ timeout: 8000 });
    await pause(2400);
    await demo("hideCaption");

    // --- Final --------------------------------------------------------------
    await card(`${LOGO}<p>Proyecto de portfolio de <strong>Ana Borrell</strong></p>
        <p class="small">Node.js · Express · MySQL · JavaScript sin frameworks<br>
        4 idiomas · Auditada con axe-core (WCAG 2.1 AA) · 127 pruebas automáticas</p>
        <p class="small">github.com/anaborrellrichart79-debug/hireflow</p>`);
    await pause(7200);
} finally {
    const video = page.video();
    await context.close();
    await browser.close();
    server.kill();
    const webm = await video.path();
    const duration = (Date.now() - startedAt) / 1000 - trimStart;
    console.log(`Grabado: ${webm} (${duration.toFixed(1)} s útiles)`);

    if (FFMPEG) {
        const mp4 = path.join(OUT, "hireflow-demo.mp4");
        execFileSync(FFMPEG, [
            "-y", "-ss", trimStart.toFixed(2), "-i", webm,
            "-vf", "scale=1920:1080:flags=lanczos",
            "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
            "-r", "30", "-movflags", "+faststart", "-an", mp4
        ], { stdio: "ignore" });
        console.log(`MP4 para LinkedIn: ${mp4}`);
    } else {
        console.log("Sin FFMPEG_PATH: queda el WebM (LinkedIn necesita MP4).");
    }
}
