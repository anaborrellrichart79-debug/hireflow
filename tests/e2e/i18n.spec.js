// La app envía su idioma a la API y los errores del backend salen traducidos
// (docs/decisions.md, entrada 038).
import { test, expect } from "@playwright/test";
import { TestData, loginAs, trackErrors } from "../helpers.js";

const data = new TestData();
let cand;
test.beforeAll(async () => { cand = await data.user("candidate", "e2e_i18n"); });
test.afterAll(async () => { await data.cleanup(); });

const EXPECT = {
    es: "Nombre: no puede estar vacío",
    en: "Name: cannot be empty",
    fr: "Nom : ne peut pas être vide",
    it: "Nome: non può essere vuoto"
};

for (const [lang, message] of Object.entries(EXPECT)) {
    test(`error de validación del backend en ${lang}`, async ({ browser }) => {
        // Navegador en español: lo que manda es el idioma elegido en la app
        const context = await browser.newContext({ locale: "es-ES" });
        await loginAs(context, cand.token, lang);
        const page = await context.newPage();
        // La prueba provoca un 400 a propósito: se ignora el aviso del navegador
        const errors = trackErrors(page, { ignoreHttpErrors: true });
        const sent = [];
        page.on("request", (r) => { if (r.url().endsWith("/api/users/me") && r.method() === "PUT") sent.push(r.headers()["accept-language"]); });

        await page.goto("/#/profile");
        await page.fill("input[name=name]", "   ");
        await page.locator("form", { has: page.locator("input[name=name]") }).locator("button[type=submit]").click();
        await expect(page.locator(".error-banner")).toContainText(message);
        expect(sent).toEqual([lang]);
        expect(errors).toEqual([]);
        await context.close();
    });
}
