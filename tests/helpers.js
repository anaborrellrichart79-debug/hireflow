// Utilidades compartidas por las pruebas (ver docs/decisions.md, entrada 040).
import { expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const BASE_URL = `http://localhost:${Number(process.env.PORT) || 3000}`;

// Sufijo único por archivo de pruebas y ejecución: los datos de una prueba
// nunca chocan con los de otra ni con los de una ejecución anterior.
export const uniqueId = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

// Todos los emails de prueba acaban en @test.local: así es fácil
// reconocerlos (y borrarlos) si una ejecución se interrumpe.
export const testEmail = (label) => `pw_${label}_${uniqueId()}@test.local`;

// --- API ---

export const api = async (method, urlPath, { token, body, lang, raw, base = BASE_URL } = {}) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (lang !== undefined) headers["Accept-Language"] = lang;
    const res = await fetch(`${base}/api${urlPath}`, {
        method,
        headers,
        body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined)
    });
    return { status: res.status, data: await res.json().catch(() => null), headers: res.headers };
};

// Lleva la cuenta de lo que crea cada archivo para borrarlo al final
// (afterAll). Borrar el usuario borra en cascada sus postulaciones y su CV.
export class TestData {
    constructor() {
        this.users = [];
        this.jobs = [];
        this.companies = [];
    }

    async user(role, label = role, name = `PW ${label}`) {
        const email = testEmail(label);
        const reg = await api("POST", "/users", { body: { name, email, password: "secret123", role, termsAccepted: true } });
        expect(reg.status, `registro de ${label}`).toBe(201);
        const login = await api("POST", "/users/login", { body: { email, password: "secret123" } });
        expect(login.status, `login de ${label}`).toBe(200);
        const user = { token: login.data.token, email, name, id: reg.data.id };
        this.users.push(user);
        return user;
    }

    async company(recruiter) {
        const id = uniqueId();
        const r = await api("POST", "/companies", { token: recruiter.token, body: { name: `PW Empresa ${id}`, email: `pw_emp_${id}@test.local` } });
        expect(r.status).toBe(201);
        this.companies.push({ id: r.data.id, token: recruiter.token });
        return r.data;
    }

    async job(recruiter, company, fields = {}) {
        const r = await api("POST", "/jobs", { token: recruiter.token, body: { company_id: company.id, title: `PW Oferta ${uniqueId()}`, ...fields } });
        expect(r.status).toBe(201);
        this.jobs.push({ id: r.data.id, token: recruiter.token });
        return r.data;
    }

    async cleanup() {
        // Orden: ofertas (una empresa con ofertas no se puede borrar), empresas, usuarios
        for (const j of this.jobs) await api("DELETE", `/jobs/${j.id}`, { token: j.token });
        for (const c of this.companies) await api("DELETE", `/companies/${c.id}`, { token: c.token });
        for (const u of this.users) await api("DELETE", "/users/me", { token: u.token, body: { password: u.password ?? "secret123" } });
    }
}

// --- Navegador ---

// Sesión e idioma en localStorage antes de que cargue la app
export const loginAs = async (context, token, lang = "es") => {
    await context.addInitScript(([tok, l]) => {
        if (tok) localStorage.setItem("hireflow_token", tok);
        localStorage.setItem("hireflow_lang", l);
    }, [token, lang]);
};

// Errores de consola y de JavaScript de una página. Los "404 (Not Found)"
// de recursos se pueden ignorar en las pruebas de la propia página 404.
// Con ignoreHttpErrors se ignoran todos los "Failed to load resource" (para
// pruebas que provocan un 4xx de la API a propósito).
export const trackErrors = (page, { ignore404 = false, ignoreHttpErrors = false } = {}) => {
    const errors = [];
    page.on("console", (m) => {
        if (m.type() !== "error") return;
        if (ignore404 && /404 \(Not Found\)/.test(m.text())) return;
        if (ignoreHttpErrors && /^Failed to load resource: the server responded with a status of 4\d\d/.test(m.text())) return;
        errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(e.message));
    return errors;
};

// Accesibilidad: WCAG 2.1 A y AA con axe-core (entrada 029)
export const expectAccessible = async (page, label) => {
    // preload: false -- si no, axe intenta descargar las hojas de Google Fonts
    // para analizarlas, y la CSP de la app lo bloquea (con razón).
    // options() va ANTES que withTags(): options() sustituye todas las
    // opciones, y si fuera después borraría el filtro de etiquetas WCAG.
    const { violations } = await new AxeBuilder({ page })
        .options({ preload: false })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
    const summary = violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
    expect(summary, `axe-core en ${label}`).toEqual([]);
};

export const expectNoHorizontalScroll = async (page) => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
};

// --- GitHub Pages ---

// Genera el paquete de Pages con el MISMO paso "Preparar" del workflow, para
// probar exactamente lo que se publica.
export const buildPagesSite = () => {
    const yml = fs.readFileSync(path.join(ROOT, ".github/workflows/privacy-page.yml"), "utf8");
    const script = yml.split("- name: Preparar")[1].split("run: |")[1].split("\n      - uses:")[0]
        .split("\n").map((line) => line.replace(/^ {10}/, "")).join("\n");
    const site = fs.mkdtempSync(path.join(os.tmpdir(), "hireflow-pages-"));
    const bash = process.platform === "win32" && fs.existsSync("C:/Program Files/Git/bin/bash.exe")
        ? "C:/Program Files/Git/bin/bash.exe"
        : "bash";
    execFileSync(bash, ["-c", `set -e\n${script.replaceAll("_site", site.replaceAll("\\", "/"))}`], { cwd: ROOT, stdio: "pipe" });
    return site;
};

// Sirve el paquete bajo /hireflow/ y responde 404.html a lo desconocido,
// como GitHub Pages. Devuelve { url, close }.
export const servePages = async (site) => {
    const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
    const server = http.createServer((req, res) => {
        const url = new URL(req.url, "http://x");
        const rel = url.pathname.startsWith("/hireflow/") ? decodeURIComponent(url.pathname.slice(10)) || "index.html" : null;
        const file = rel && path.join(site, rel);
        if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
            res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
            return fs.createReadStream(file).pipe(res);
        }
        res.writeHead(404, { "Content-Type": "text/html" });
        fs.createReadStream(path.join(site, "404.html")).pipe(res);
    });
    await new Promise((resolve) => server.listen(0, resolve));
    return { url: `http://localhost:${server.address().port}/hireflow/`, close: () => new Promise((r) => server.close(r)) };
};

// --- Servidor aparte ---

const freePort = () => new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

// Arranca otra instancia de la app en un puerto libre, con su propia memoria
// (p. ej. su propio contador de intentos de login) y, si hace falta, variables
// de entorno propias (p. ej. TRUST_PROXY). Devuelve { base, stop }.
export const startServer = async (env = {}) => {
    const port = await freePort();
    const child = spawn(process.execPath, ["server.js"], { cwd: path.join(ROOT, "backend"), env: { ...process.env, ...env, PORT: String(port) }, stdio: "ignore" });
    const base = `http://localhost:${port}`;
    for (let i = 0; i < 60; i++) {
        try { await fetch(`${base}/privacy.html`); return { base, stop: () => child.kill() }; } catch { await new Promise((r) => setTimeout(r, 250)); }
    }
    child.kill();
    throw new Error("El servidor de pruebas no arrancó");
};
