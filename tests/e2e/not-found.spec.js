// Página 404 con el maletín: app, Express y GitHub Pages
// (docs/decisions.md, entrada 036).
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { loginAs, trackErrors, expectAccessible, expectNoHorizontalScroll, buildPagesSite, servePages } from "../helpers.js";

test("ruta inexistente de la app: tres vueltas y luego el bocadillo", async ({ page, context }) => {
    const errors = trackErrors(page);
    await loginAs(context, null, "es");
    await page.goto("/#/esto-no-existe");
    const mascot = page.locator(".lost-mascot");
    await expect(mascot).toBeVisible();
    expect(await mascot.evaluate((e) => getComputedStyle(e).animationName)).toBe("lost-search");
    expect(await page.locator(".lost-bubble").evaluate((e) => getComputedStyle(e).opacity)).toBe("0");
    await expect(page.locator(".lost-bubble.visible")).toHaveText("Creo que no lo encuentro…", { timeout: 5000 });
    await expect(page.locator(".lost-title")).toHaveText("Página no encontrada");
    await expect(page.locator("#mascot-root .mascot-img"), "la mascota global se oculta").toBeHidden();
    await expectAccessible(page, "404 de la app");

    await page.locator(".lost-home").click();
    await expect(page.locator(".lost-mascot")).toHaveCount(0);
    expect(await page.evaluate(() => document.body.classList.contains("route-not-found"))).toBe(false);
    expect(errors).toEqual([]);
});

test("en inglés y con movimiento reducido", async ({ browser }) => {
    const en = await browser.newContext();
    await loginAs(en, null, "en");
    const page = await en.newPage();
    await page.goto("/#/nope");
    await expect(page.locator(".lost-bubble.visible")).toHaveText("I don't think I can find it…", { timeout: 5000 });
    await en.close();

    const reduced = await browser.newContext({ reducedMotion: "reduce" });
    const page2 = await reduced.newPage();
    await page2.goto("/#/nada");
    await expect(page2.locator(".lost-bubble.visible")).toBeVisible({ timeout: 500 });
    expect(await page2.locator(".lost-mascot").evaluate((e) => getComputedStyle(e).animationName)).toBe("none");
    await reduced.close();
});

test("Express: URL inexistente fuera de /api -> 404.html; en /api sigue siendo JSON", async ({ page, request }) => {
    const errors = trackErrors(page, { ignore404: true });
    const response = await page.goto("/a/b/c/d");
    expect(response.status()).toBe(404);
    await expect(page.locator(".lost-bubble.visible")).toBeVisible({ timeout: 5000 });
    expect(await page.locator(".lost-mascot").evaluate((e) => e.naturalWidth), "carga el maletín en rutas profundas").toBeGreaterThan(0);
    await expect(page.locator(".lost-home")).toHaveCSS("border-radius", "999px");
    expect(await page.locator(".lost-home").evaluate((a) => new URL(a.href).pathname)).toBe("/");
    // Página independiente: su título es el <h1> (dentro de la app es un <h2>)
    await expect(page.locator("h1.lost-title")).toHaveCount(1);
    await expectAccessible(page, "404.html");

    const apiResponse = await request.get("/api/nope", { headers: { Accept: "text/html" } });
    expect(apiResponse.status()).toBe(404);
    expect(apiResponse.headers()["content-type"]).toContain("application/json");
    expect((await request.get("/privacy.html")).status()).toBe(200);
    expect(errors).toEqual([]);
});

test("320px: sin desbordamiento y el bocadillo cabe", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 320, height: 800 } });
    const page = await context.newPage();
    await page.goto("/#/xx");
    await expect(page.locator(".lost-bubble.visible")).toBeVisible({ timeout: 5000 });
    await expectNoHorizontalScroll(page);
    const box = await page.locator(".lost-bubble").boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    await context.close();
});

test.describe("GitHub Pages", () => {
    let site, server;
    test.beforeAll(async () => { site = buildPagesSite(); server = await servePages(site); });
    test.afterAll(async () => { await server?.close(); if (site) fs.rmSync(site, { recursive: true, force: true }); });

    test("ruta profunda desconocida: 404 con el maletín, y 'Volver' lleva a la política", async ({ page }) => {
        expect(fs.readFileSync(`${site}/404.html`, "utf8")).toContain('<base href="/hireflow/">');
        const response = await page.goto(`${server.url}una/ruta/que/no/existe`);
        expect(response.status()).toBe(404);
        await expect(page.locator(".lost-bubble.visible")).toBeVisible({ timeout: 5000 });
        expect(await page.locator(".lost-mascot").evaluate((e) => e.naturalWidth)).toBeGreaterThan(0);
        await page.locator(".lost-home").click();
        await expect(page).toHaveURL(server.url);
        await expect(page.locator("h1")).toHaveText(/Política de Privacidad|Privacy Policy/);
    });
});
