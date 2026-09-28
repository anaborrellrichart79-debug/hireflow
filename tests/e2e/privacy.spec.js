// Política de Privacidad: página pública en 4 idiomas, enlace desde el
// registro, "Volver a HireFlow" y paquete de GitHub Pages
// (docs/decisions.md, entradas 035, 037 y 039).
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { trackErrors, expectAccessible, expectNoHorizontalScroll, buildPagesSite, servePages } from "../helpers.js";

const EXPECT = {
    es: { h1: "Política de Privacidad", date: "septiembre de 2026", back: "Volver a HireFlow", authority: "aepd.es", label: "Idioma" },
    en: { h1: "Privacy Policy", date: "September 2026", back: "Back to HireFlow", authority: "aepd.es", label: "Language" },
    fr: { h1: "Politique de Confidentialité", date: "septembre 2026", back: "Retour à HireFlow", authority: "cnil.fr", label: "Langue" },
    it: { h1: "Informativa sulla Privacy", date: "settembre 2026", back: "Torna a HireFlow", authority: "garanteprivacy.it", label: "Lingua" }
};

for (const [lang, e] of Object.entries(EXPECT)) {
    test(`página pública en ${lang}`, async ({ page }) => {
        const errors = trackErrors(page);
        await page.goto(`/privacy.html?lang=${lang}`);
        await expect(page.locator("h1")).toHaveText(e.h1);
        await expect(page.locator("html")).toHaveAttribute("lang", lang);
        await expect(page).toHaveTitle(new RegExp(`^${e.h1}`));
        await expect(page.locator("main h2")).toHaveCount(11);
        const main = page.locator("main");
        await expect(main).toContainText(e.date);
        await expect(main).toContainText("ana.borrell.richart79@gmail.com");
        await expect(main).toContainText(e.authority);
        await expect(page.locator("#privacy-lang a")).toHaveCount(4);
        await expect(page.locator("#privacy-lang")).toHaveAttribute("aria-label", e.label);
        await expect(page.locator("a[aria-current=page]")).toHaveAttribute("hreflang", lang);
        // "Volver a HireFlow" arriba y abajo, hacia la app
        await expect(page.locator(".privacy-header a.privacy-back")).toHaveText(`← ${e.back}`);
        await expect(page.locator("a.privacy-back-button")).toHaveText(e.back);
        expect(await page.locator("a.privacy-back-button").evaluate((a) => new URL(a.href).pathname)).toBe("/");
        await expectAccessible(page, `política en ${lang}`);
        expect(errors).toEqual([]);
    });
}

test("sin ?lang: idioma de la app, y si no, el del navegador; idiomas inválidos se ignoran", async ({ browser }) => {
    const fr = await browser.newContext({ locale: "fr-FR" });
    const page = await fr.newPage();
    await page.goto("/privacy.html");
    await expect(page.locator("h1")).toHaveText(EXPECT.fr.h1);
    await page.evaluate(() => localStorage.setItem("hireflow_lang", "it"));
    await page.reload();
    await expect(page.locator("h1")).toHaveText(EXPECT.it.h1);
    await page.goto("/privacy.html?lang=<script>");
    await expect(page.locator("h1")).toHaveText(EXPECT.it.h1);
    await page.getByRole("link", { name: "Español" }).click();
    await expect(page).toHaveURL(/lang=es/);
    await expect(page.locator("h1")).toHaveText(EXPECT.es.h1);
    await fr.close();
});

test("'Volver a HireFlow' abre la app", async ({ page }) => {
    await page.goto("/privacy.html");
    await page.locator("a.privacy-back-button").click();
    await expect(page.locator(".topbar")).toBeVisible();
});

test("a 320px con los 4 idiomas y el enlace de volver", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 320, height: 800 } });
    const page = await context.newPage();
    await page.goto("/privacy.html?lang=fr");
    await expect(page.locator("h1")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await context.close();
});

test("el modal del registro enlaza a la página en el idioma de la app", async ({ browser }) => {
    for (const lang of ["es", "fr"]) {
        const context = await browser.newContext();
        await context.addInitScript((l) => localStorage.setItem("hireflow_lang", l), lang);
        const page = await context.newPage();
        await page.goto("/#/login");
        // La casilla de la política está en el formulario de registro
        await page.locator(".auth-toggle a").click();
        await page.getByText(EXPECT[lang].h1, { exact: true }).first().click();
        const dialog = page.locator("dialog.hf-dialog");
        await expect(dialog).toContainText(EXPECT[lang].authority);
        const link = dialog.locator("a[target=_blank]");
        await expect(link).toHaveAttribute("href", `privacy.html?lang=${lang}`);
        const [popup] = await Promise.all([page.waitForEvent("popup"), link.click()]);
        await expect(popup.locator("h1")).toHaveText(EXPECT[lang].h1);
        await expect(dialog, "el formulario sigue abierto detrás").toBeVisible();
        await context.close();
    }
});

test.describe("paquete de GitHub Pages", () => {
    let site, server;
    test.beforeAll(async () => {
        site = buildPagesSite();
        server = await servePages(site);
    });
    test.afterAll(async () => {
        await server?.close();
        if (site) fs.rmSync(site, { recursive: true, force: true });
    });

    test("solo publica la política y la 404, sin la app", async () => {
        const files = fs.readdirSync(site, { recursive: true }).map((f) => f.replaceAll("\\", "/")).filter((f) => fs.statSync(path.join(site, f)).isFile()).sort();
        expect(files).toEqual([
            "404.html", "assets/icons/favicon.svg", "assets/mascota-soporte.svg", "index.html",
            "js/components/lostMascot.js", "js/i18n.js", "js/notFoundPage.js", "js/privacyPage.js", "js/privacyPolicyContent.js",
            "privacy.html", "style/notfound.css", "style/privacy.css"
        ]);
        expect(fs.readFileSync(path.join(site, "privacy.html"), "utf8")).not.toContain("hireflow-app");
    });

    test("la raíz muestra la política, sin 'Volver a HireFlow'", async ({ page }) => {
        const errors = trackErrors(page);
        await page.goto(server.url);
        await expect(page.locator("main h2")).toHaveCount(11);
        await expect(page.locator("a.privacy-back, a.privacy-back-button")).toHaveCount(0);
        await page.getByRole("link", { name: "English" }).click();
        await expect(page.locator("h1")).toHaveText(EXPECT.en.h1);
        expect(errors).toEqual([]);
    });
});
