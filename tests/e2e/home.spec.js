// Inicio: resumen de la candidata, panel de la empresa y accesos rápidos
// (docs/decisions.md, entradas 013 y 032).
import { test, expect } from "@playwright/test";
import { TestData, api, loginAs, trackErrors, expectAccessible, expectNoHorizontalScroll } from "../helpers.js";

test.describe.configure({ mode: "serial" });

const data = new TestData();
let rec, cand1, cand2, job;

test.beforeAll(async () => {
    [rec, cand1, cand2] = await Promise.all([data.user("recruiter", "e2e_home_r"), data.user("candidate", "e2e_home_c1"), data.user("candidate", "e2e_home_c2")]);
    const company = await data.company(rec);
    job = await data.job(rec, company);
    const apps = [];
    for (const cand of [cand1, cand2]) {
        apps.push((await api("POST", "/applications", { token: cand.token, body: { job_offer_id: job.id, consent: true, signature: cand.name } })).data);
    }
    await api("PUT", `/applications/${apps[0].id}/status`, { token: rec.token, body: { status: "interview" } });
});

test.afterAll(async () => { await data.cleanup(); });

const tile = (page, label) => page.locator(".stat-card", { hasText: label }).locator(".stat-value");

test("panel de la empresa: métricas, embudo y tabla por oferta", async ({ page, context }) => {
    const errors = trackErrors(page);
    await loginAs(context, rec.token);
    await page.goto("/#/");
    await expect(tile(page, "Ofertas publicadas")).toHaveText("1");
    await expect(page.locator(".dash-kpis .stat-card", { hasText: "Postulantes" }).locator(".stat-value")).toHaveText("2");
    await expect(tile(page, "Llegan a entrevista")).toHaveText(/50\s?%/);

    const funnel = page.locator(".funnel-row");
    await expect(funnel).toHaveCount(3);
    await expect(funnel.nth(1)).toHaveAttribute("aria-label", /En entrevista u oferta: 1 de 2/);
    await funnel.nth(1).focus();
    await expect(funnel.nth(1).locator(".funnel-tooltip")).toBeVisible();

    const row = page.locator(".dash-table tbody tr", { hasText: job.title });
    await expect(row.locator("td").first()).toContainText("2");
    await expectAccessible(page, "panel de la empresa");

    await row.getByRole("button", { name: job.title }).click();
    await expect(page).toHaveURL(/#\/applicants$/);
    await expect(page.locator(".kanban-filter")).toHaveValue(String(job.id));
    expect(errors).toEqual([]);
});

test("una empresa sin ofertas ve cómo empezar", async ({ page, context }) => {
    const empty = await data.user("recruiter", "e2e_home_r2");
    await loginAs(context, empty.token);
    await page.goto("/#/");
    await expect(page.getByText("Todavía no has publicado ofertas.")).toBeVisible();
    await page.locator(".dash-empty").getByRole("button", { name: "+ Nueva oferta" }).click();
    await expect(page).toHaveURL(/#\/jobs\/new$/);
});

test("resumen de la candidata y accesos rápidos", async ({ page, context }) => {
    await loginAs(context, cand2.token);
    await page.goto("/#/");
    await expect(tile(page, "Postulaciones")).toHaveText("1");
    await expect(tile(page, "Próxima entrevista")).toHaveText("Ninguna programada");
    await expect(page.locator(".status-badge", { hasText: "Postulado: 1" })).toBeVisible();
    await expectAccessible(page, "Inicio (candidata)");

    const links = page.locator(".quick-link-card");
    await expect(links).toHaveText(["Ofertas", "Mis postulaciones", "Calendario", "Mi perfil", "Asistente IA"]);
    await links.filter({ hasText: "Calendario" }).click();
    await expect(page).toHaveURL(/#\/calendar$/);
});

test("Inicio a 320px, en los dos roles", async ({ browser }) => {
    for (const user of [rec, cand1]) {
        const context = await browser.newContext({ viewport: { width: 320, height: 800 } });
        await loginAs(context, user.token);
        const page = await context.newPage();
        await page.goto("/#/");
        await expect(page.locator(".quick-link-card").first()).toBeVisible();
        await expectNoHorizontalScroll(page);
        await context.close();
    }
});
