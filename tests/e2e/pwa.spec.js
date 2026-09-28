// App instalable (PWA): manifest, iconos, service worker y página "Sin
// conexión" (docs/decisions.md, entrada 042).
import { test, expect } from "@playwright/test";
import { trackErrors, expectAccessible, loginAs } from "../helpers.js";

test("el manifest es válido y sus iconos existen con el tamaño declarado", async ({ page, request }) => {
    await page.goto("/");
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    const res = await request.get(`/${href}`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("manifest+json");
    const manifest = await res.json();
    expect(manifest).toMatchObject({ name: "HireFlow", short_name: "HireFlow", display: "standalone", start_url: "./#/", scope: "./" });
    expect(manifest.icons.some((i) => i.purpose === "maskable")).toBe(true);
    for (const icon of manifest.icons) {
        const img = await request.get(`/${icon.src}`);
        expect(img.status(), icon.src).toBe(200);
        expect(img.headers()["content-type"]).toBe("image/png");
        const [w] = icon.sizes.split("x").map(Number);
        const size = await page.evaluate(async (src) => {
            const el = new Image();
            el.src = src;
            await el.decode();
            return el.naturalWidth;
        }, `/${icon.src}`);
        expect(size, icon.src).toBe(w);
    }
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", manifest.theme_color);
});

test("el service worker se registra y no guarda la app ni la API en caché", async ({ page }) => {
    await page.goto("/");
    const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    expect(scope).toMatch(/\/$/);
    const cached = await page.evaluate(async () => {
        const keys = await caches.keys();
        const urls = [];
        for (const key of keys) for (const req of await (await caches.open(key)).keys()) urls.push(new URL(req.url).pathname);
        return urls.sort();
    });
    expect(cached).toEqual(["/assets/icons/favicon.svg", "/assets/mascota-soporte.svg", "/js/offlinePage.js", "/offline.html", "/style/notfound.css"]);
});

test("sin conexión se ve 'Sin conexión' (traducido) y 'Reintentar' vuelve cuando hay red", async ({ page, context }) => {
    const errors = trackErrors(page);
    await loginAs(context, null, "fr");
    await page.goto("/");
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload(); // la página queda controlada por el service worker
    expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

    await context.setOffline(true);
    await page.goto("/#/jobs").catch(() => {});
    await page.reload().catch(() => {});
    await expect(page.locator("#offline-title")).toHaveText("Pas de connexion internet");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expect(page.locator(".lost-mascot")).toBeVisible();
    expect(await page.locator(".lost-mascot").evaluate((e) => e.naturalWidth), "el maletín sale de la caché").toBeGreaterThan(0);
    await expectAccessible(page, "página Sin conexión");

    await context.setOffline(false);
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(page.locator(".topbar")).toBeVisible();
    // Los errores de red mientras no había conexión son esperados
    expect(errors.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to (load|fetch)|NetworkError/.test(e))).toEqual([]);
});

test("una URL que no existe sigue dando 404 (el service worker no la tapa)", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    const response = await page.goto("/esto/no/existe");
    expect(response.status()).toBe(404);
    await expect(page.locator(".lost-mascot")).toBeVisible();
});
