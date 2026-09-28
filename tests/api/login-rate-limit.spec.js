// Login: mensaje genérico traducido y límite de intentos fallidos
// (docs/decisions.md, entradas 020 y 038). Va contra una instancia propia del
// servidor: sus intentos fallidos bloquean la IP 15 minutos, y en el servidor
// compartido eso tumbaría el login del resto de pruebas.
import { test, expect } from "@playwright/test";
import { api, startServer, testEmail } from "../helpers.js";

test.describe.configure({ mode: "serial" });

let server;
test.beforeAll(async () => { server = await startServer(); });
test.afterAll(() => server?.stop());

const CREDENTIALS = {
    es: "Email o contraseña incorrectos",
    en: "Incorrect email or password",
    fr: "Email ou mot de passe incorrect",
    it: "Email o password errati"
};

test("email inexistente: 401 con el mensaje genérico, en cada idioma", async () => {
    for (const [lang, message] of Object.entries(CREDENTIALS)) {
        const r = await api("POST", "/users/login", { base: server.base, lang, body: { email: testEmail("nadie"), password: "secret123" } });
        expect(r.status, lang).toBe(401);
        expect(r.data.message, lang).toBe(message);
    }
});

test("al superar el límite de intentos fallidos: 429 traducido", async () => {
    // Ya van 4 intentos fallidos; el límite es 10 por IP cada 15 minutos
    let last;
    for (let i = 0; i < 7; i++) {
        last = await api("POST", "/users/login", { base: server.base, lang: "it", body: { email: testEmail("nadie"), password: "secret123" } });
    }
    expect(last.status).toBe(429);
    expect(last.data.message).toBe("Troppi tentativi di accesso. Riprova tra qualche minuto.");
    expect(last.headers.get("ratelimit-policy")).toBeTruthy();
});
