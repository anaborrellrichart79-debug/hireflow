// Calendario por semanas: la empresa agenda y borra entrevistas; la candidata
// las ve (docs/decisions.md, entradas 017, 023 y 024).
import { test, expect } from "@playwright/test";
import { TestData, api, loginAs, trackErrors, expectAccessible, expectNoHorizontalScroll } from "../helpers.js";

test.describe.configure({ mode: "serial" });

const data = new TestData();
let rec, cand, job;

// Dentro de 3 semanas, a las 10:30 (hora local): siempre en una semana futura
const when = new Date();
when.setDate(when.getDate() + 21);
when.setHours(10, 30, 0, 0);
const pad = (n) => String(n).padStart(2, "0");
const datetimeLocal = `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}T${pad(when.getHours())}:${pad(when.getMinutes())}`;

test.beforeAll(async () => {
    [rec, cand] = await Promise.all([data.user("recruiter", "e2e_cal_r"), data.user("candidate", "e2e_cal_c")]);
    const company = await data.company(rec);
    job = await data.job(rec, company);
    await api("POST", "/applications", { token: cand.token, body: { job_offer_id: job.id, consent: true, signature: cand.name } });
});

test.afterAll(async () => { await data.cleanup(); });

test("navegar entre semanas cambia el título; 'Hoy' vuelve", async ({ page, context }) => {
    await loginAs(context, rec.token);
    await page.goto("/#/calendar");
    const title = page.locator(".week-title");
    const current = await title.textContent();
    await page.getByRole("button", { name: "Semana siguiente" }).click();
    await expect(title).not.toHaveText(current);
    await page.getByRole("button", { name: "Hoy" }).click();
    await expect(title).toHaveText(current);
    await page.getByRole("button", { name: "Semana anterior" }).click();
    await expect(title).not.toHaveText(current);
    await expect(page.locator(".week-column")).toHaveCount(7);
});

test("la empresa agenda una entrevista y el calendario salta a su semana", async ({ page, context }) => {
    const errors = trackErrors(page);
    await loginAs(context, rec.token);
    await page.goto("/#/calendar");
    await page.getByRole("button", { name: "Añadir entrevista" }).click();
    const dialog = page.locator("dialog.hf-dialog");
    await dialog.getByRole("combobox").selectOption({ label: `${cand.name} — ${job.title}` });
    await dialog.locator("input[type=datetime-local]").fill(datetimeLocal);
    await dialog.getByPlaceholder("Lugar o enlace").fill("Oficina central");
    await expectAccessible(page, "diálogo de agendar entrevista");
    await dialog.getByRole("button", { name: "Programar entrevista" }).click();

    await expect(page.getByText("Entrevista programada correctamente")).toBeVisible();
    const event = page.locator(".week-event", { hasText: cand.name });
    await expect(event).toContainText("Oficina central");
    await expect(event.getByRole("button", { name: "Eliminar" })).toBeVisible();
    await expectAccessible(page, "calendario de la empresa");

    // Agendar la entrevista pasa la postulación a "En entrevista" (entrada 023)
    const apps = (await api("GET", "/applications", { token: cand.token })).data;
    expect(apps[0].status).toBe("interview");
    expect(errors).toEqual([]);
});

test("la candidata la ve (sin poder borrarla) y puede saltar a la próxima", async ({ page, context }) => {
    await loginAs(context, cand.token);
    await page.goto("/#/calendar");
    await expect(page.getByText("No hay entrevistas esta semana.")).toBeVisible();
    await page.getByRole("button", { name: /^Ir a la próxima:/ }).click();
    const event = page.locator(".week-event", { hasText: job.title });
    await expect(event).toContainText("Oficina central");
    await expect(event.getByRole("button", { name: "Eliminar" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Añadir entrevista" })).toHaveCount(0);

    await page.goto("/#/");
    const next = page.locator(".stat-card", { hasText: "Próxima entrevista" });
    await expect(next.locator(".stat-value")).not.toHaveText("Ninguna programada");
});

test("borrar la entrevista pide confirmación y desaparece para la candidata", async ({ page, context }) => {
    await loginAs(context, rec.token);
    await page.goto("/#/calendar");
    await page.getByRole("button", { name: /^Ir a la próxima:/ }).click();
    await page.locator(".week-event", { hasText: cand.name }).getByRole("button", { name: "Eliminar" }).click();
    const dialog = page.locator("dialog.hf-dialog");
    await expect(dialog).toContainText("También desaparecerá del calendario del candidato.");
    await dialog.getByRole("button", { name: "Sí, eliminar" }).click();
    await expect(page.locator(".week-event", { hasText: cand.name })).toHaveCount(0);
    expect((await api("GET", "/interviews", { token: cand.token })).data).toEqual([]);
});

test("sin postulantes, 'Añadir entrevista' lo explica; y a 320px no desborda", async ({ browser }) => {
    const lonely = await data.user("recruiter", "e2e_cal_r2");
    const context = await browser.newContext({ viewport: { width: 320, height: 800 } });
    await loginAs(context, lonely.token);
    const page = await context.newPage();
    await page.goto("/#/calendar");
    await expectNoHorizontalScroll(page);
    await page.getByRole("button", { name: "Añadir entrevista" }).click();
    await expect(page.locator("dialog.hf-dialog")).toContainText("No tienes postulantes disponibles");
    await context.close();
});
