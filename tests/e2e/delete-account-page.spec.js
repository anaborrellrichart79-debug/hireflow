// Página pública "Cómo eliminar tu cuenta", el enlace que pide Google Play
// (docs/decisions.md, entrada 042).
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { TestData, loginAs, trackErrors, expectAccessible, expectNoHorizontalScroll, buildPagesSite, servePages } from "../helpers.js";

// Nombres de pantalla y botón que la página cita, tal como los muestra la app
const UI = {
    es: { title: "Cómo eliminar tu cuenta de HireFlow", profile: "Mi perfil", button: "Eliminar mi cuenta", privacy: "Consulta la Política de Privacidad" },
    en: { title: "How to delete your HireFlow account", profile: "My profile", button: "Delete my account", privacy: "Read the Privacy Policy" },
    fr: { title: "Comment supprimer votre compte HireFlow", profile: "Mon profil", button: "Supprimer mon compte", privacy: "Consulter la Politique de Confidentialité" },
    it: { title: "Come eliminare il tuo account HireFlow", profile: "Il mio profilo", button: "Elimina il mio account", privacy: "Leggi l'Informativa sulla Privacy" }
};

const data = new TestData();
let cand;
test.beforeAll(async () => { cand = await data.user("candidate", "e2e_delpage"); });
test.afterAll(async () => { await data.cleanup(); });

for (const [lang, ui] of Object.entries(UI)) {
    test(`página en ${lang}: pasos, email, qué se borra y enlaces`, async ({ page }) => {
        const errors = trackErrors(page);
        await page.goto(`/delete-account.html?lang=${lang}`);
        await expect(page.locator("h1")).toHaveText(ui.title);
        await expect(page.locator("html")).toHaveAttribute("lang", lang);
        await expect(page.locator("main ol li")).toHaveCount(4);
        await expect(page.locator("main ol")).toContainText(ui.profile);
        await expect(page.locator("main ol")).toContainText(ui.button);
        await expect(page.locator("main")).toContainText("ana.borrell.richart79@gmail.com");
        await expect(page.locator("main ul li")).toHaveCount(2);
        await expect(page.locator("#privacy-lang a")).toHaveCount(4);
        await expect(page.getByRole("link", { name: ui.privacy })).toHaveAttribute("href", `privacy.html?lang=${lang}`);
        await expect(page.locator("a.privacy-back-button")).toBeVisible();
        await expectAccessible(page, `eliminar cuenta en ${lang}`);
        expect(errors).toEqual([]);
    });

    test(`${lang}: los nombres que cita coinciden con los de la app`, async ({ browser }) => {
        const context = await browser.newContext();
        await loginAs(context, cand.token, lang);
        const page = await context.newPage();
        await page.goto("/#/profile");
        await expect(page.locator(".hireflow-form h2").first()).toHaveText(ui.profile);
        await expect(page.locator(".danger-zone button")).toHaveText(ui.button);
        await context.close();
    });
}

test("la política enlaza a esta página, y a 320px no hay desbordamiento", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 320, height: 800 } });
    const page = await context.newPage();
    await page.goto("/privacy.html?lang=fr");
    await page.getByRole("link", { name: /supprimer votre compte/i }).click();
    await expect(page).toHaveURL(/delete-account\.html\?lang=fr$/);
    await expect(page.locator("h1")).toHaveText(UI.fr.title);
    await expectNoHorizontalScroll(page);
    await context.close();
});

test.describe("GitHub Pages", () => {
    let site, server;
    test.beforeAll(async () => { site = buildPagesSite(); server = await servePages(site); });
    test.afterAll(async () => { await server?.close(); if (site) fs.rmSync(site, { recursive: true, force: true }); });

    test("se publica, sin 'Volver a HireFlow', y enlaza con la política", async ({ page }) => {
        const errors = trackErrors(page);
        await page.goto(`${server.url}delete-account.html`);
        await expect(page.locator("h1")).toHaveText(UI.es.title);
        await expect(page.locator("a.privacy-back, a.privacy-back-button")).toHaveCount(0);
        await page.getByRole("link", { name: UI.es.privacy }).click();
        await expect(page.locator("main h2")).toHaveCount(11);
        expect(errors).toEqual([]);
    });
});
