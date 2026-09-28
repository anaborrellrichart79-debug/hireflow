// Capturas del README a partir de los datos de demostración (ver
// docs/decisions.md, entrada 044).
//
//   npm run demo:data          (primero: rellena hireflow_demo)
//   npm run demo:screenshots   (arranca la app contra hireflow_demo y captura)
//
// Guarda las imágenes en docs/screenshots/.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs/screenshots");
const DEMO_DB = process.env.DEMO_DB_NAME || "hireflow_demo";
const PASSWORD = "Demo2026!";
fs.mkdirSync(OUT, { recursive: true });

const port = await new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, () => { const p = s.address().port; s.close(() => resolve(p)); });
});
const server = spawn(process.execPath, ["server.js"], { cwd: path.join(ROOT, "backend"), env: { ...process.env, DB_NAME: DEMO_DB, PORT: String(port) }, stdio: "ignore" });
const APP = `http://localhost:${port}`;
for (let i = 0; i < 80; i++) {
    try { await fetch(`${APP}/privacy.html`); break; } catch { await new Promise((r) => setTimeout(r, 250)); }
}

const token = async (email) => {
    const res = await fetch(`${APP}/api/users/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: PASSWORD }) });
    const data = await res.json();
    if (!data.token) throw new Error(`No se pudo entrar como ${email}: ¿has ejecutado npm run demo:data?`);
    return data.token;
};
const marta = await token("marta.gil@example.com");
const lucia = await token("lucia.navarro@example.com");

const browser = await chromium.launch();

// La mascota global se mueve al azar: se oculta para que las capturas no
// dependan del momento en que se toman (en la app sigue ahí). Con
// element.style y no con una hoja inyectada: la CSP de la app bloquea el CSS
// en línea, y no hace falta saltársela.
const hideMascot = (page) => page.evaluate(() => { const m = document.getElementById("mascot-root"); if (m) m.style.display = "none"; });

const shot = async ({ file, tok, lang = "es", route, width = 1280, height = 800, prepare, fullPage = false }) => {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, locale: "es-ES" });
    await context.addInitScript(([t, l]) => {
        if (t) localStorage.setItem("hireflow_token", t);
        localStorage.setItem("hireflow_lang", l);
    }, [tok, lang]);
    const page = await context.newPage();
    await page.goto(`${APP}/${route}`);
    await hideMascot(page);
    await page.waitForLoadState("networkidle");
    if (prepare) await prepare(page);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, file), fullPage });
    await context.close();
    console.log("ok", file);
};

try {
    await shot({ file: "empresa-panel.png", tok: marta, route: "#/", prepare: (p) => p.locator(".funnel-row").first().waitFor() });
    await shot({ file: "empresa-kanban.png", tok: marta, route: "#/applicants", width: 1440, height: 900, prepare: async (p) => {
        const card = p.locator(".kanban-card", { hasText: "Lucía Navarro" }).filter({ hasText: "Desarrolladora Frontend" });
        await card.getByRole("button", { name: "Ver perfil" }).click();
        await card.locator(".applicant-cv").waitFor();
    } });
    await shot({ file: "empresa-calendario.png", tok: marta, route: "#/calendar", width: 1440, height: 800, prepare: async (p) => {
        await p.locator(".week-title").waitFor();
        const next = p.getByRole("button", { name: /^Ir a la próxima:/ });
        if (await next.count()) await next.click();
        await p.locator(".week-event").first().waitFor();
    } });
    await shot({ file: "candidata-ofertas.png", tok: lucia, route: "#/jobs", height: 900, prepare: (p) => p.locator(".job-card").first().waitFor() });
    await shot({ file: "candidata-postulaciones.png", tok: lucia, route: "#/applications", width: 1440, height: 640, prepare: (p) => p.locator(".kanban-card").first().waitFor() });
    await shot({ file: "candidata-asistente.png", tok: lucia, route: "#/ai", prepare: async (p) => {
        const input = p.getByPlaceholder("Escribe tu pregunta...");
        await input.fill("¿Encajo con la oferta Desarrolladora Frontend?");
        await input.press("Enter");
        await p.getByText("Comparado con las habilidades de tu CV.").waitFor();
    } });
    await shot({ file: "candidata-movil-en.png", tok: lucia, lang: "en", route: "#/", width: 390, height: 844, prepare: (p) => p.locator(".stat-card").first().waitFor() });
    await shot({ file: "pagina-404.png", tok: null, route: "#/esto-no-existe", width: 900, height: 700, prepare: (p) => p.locator(".lost-bubble.visible").waitFor({ timeout: 6000 }) });
} finally {
    await browser.close();
    server.kill();
}
