// Preparación para el despliegue (docs/decisions.md, entrada 042):
// - TRUST_PROXY: detrás de un proxy, el límite de intentos de login cuenta cada
//   IP real por separado; sin él, falsear X-Forwarded-For no sirve de nada.
// - /.well-known/ se sirve (Express ignora por defecto las carpetas con punto).
// Cada prueba de límite usa su propio servidor, con su propio contador.
import { test, expect } from "@playwright/test";
import { api, startServer, testEmail, BASE_URL } from "../helpers.js";

const failedLogin = (base, ip) => fetch(`${base}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(ip ? { "X-Forwarded-For": ip } : {}) },
    body: JSON.stringify({ email: testEmail("nadie"), password: "secret123" })
}).then((r) => r.status);

test("sin TRUST_PROXY, cambiar X-Forwarded-For no evita el límite de intentos", async () => {
    const server = await startServer({ TRUST_PROXY: "" });
    try {
        const statuses = [];
        for (let i = 0; i < 11; i++) statuses.push(await failedLogin(server.base, `203.0.113.${i + 1}`));
        expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
        expect(statuses[10], "la IP falseada no cuenta: se bloquea igual").toBe(429);
    } finally {
        server.stop();
    }
});

test("con TRUST_PROXY=1, cada IP real tiene su propio límite", async () => {
    const server = await startServer({ TRUST_PROXY: "1" });
    try {
        const sameIp = [];
        for (let i = 0; i < 11; i++) sameIp.push(await failedLogin(server.base, "198.51.100.7"));
        expect(sameIp[10], "la misma IP se bloquea").toBe(429);
        expect(await failedLogin(server.base, "198.51.100.8"), "otra IP, no").toBe(401);
    } finally {
        server.stop();
    }
});

test("/.well-known/security.txt se sirve como texto", async () => {
    const res = await fetch(`${BASE_URL}/.well-known/security.txt`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    const body = await res.text();
    expect(body).toContain("Contact: mailto:ana.borrell.richart79@gmail.com");
    expect(body).toMatch(/^Expires: 20\d\d-/m);
    const missing = await fetch(`${BASE_URL}/.well-known/no-existe.json`);
    expect(missing.status).toBe(404);
});

test("la API sigue funcionando igual detrás del proxy", async () => {
    const server = await startServer({ TRUST_PROXY: "1" });
    try {
        const r = await api("GET", "/users/me", { base: server.base });
        expect(r.status).toBe(401);
    } finally {
        server.stop();
    }
});
