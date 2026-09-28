// Tablero Kanban: la empresa mueve postulantes (desplegable y arrastre) y la
// candidata lo ve como novedad (docs/decisions.md, entradas 017, 023 y 031).
import { test, expect } from "@playwright/test";
import { TestData, api, loginAs, trackErrors, expectAccessible, expectNoHorizontalScroll } from "../helpers.js";

test.describe.configure({ mode: "serial" });

const data = new TestData();
let rec, cand1, cand2, jobA, jobB;

test.beforeAll(async () => {
    [rec, cand1, cand2] = await Promise.all([data.user("recruiter", "e2e_kb_r"), data.user("candidate", "e2e_kb_c1"), data.user("candidate", "e2e_kb_c2")]);
    const company = await data.company(rec);
    jobA = await data.job(rec, company);
    jobB = await data.job(rec, company);
    for (const [cand, job] of [[cand1, jobA], [cand2, jobA], [cand2, jobB]]) {
        const r = await api("POST", "/applications", { token: cand.token, body: { job_offer_id: job.id, consent: true, signature: cand.name } });
        expect(r.status).toBe(201);
    }
});

test.afterAll(async () => { await data.cleanup(); });

const column = (page, label) => page.locator(`section.kanban-column[aria-label="${label}"]`);
const cardOf = (page, name, job) => page.locator(".kanban-card", { hasText: name }).filter({ hasText: job.title });

test("la empresa ve sus postulantes por columnas y filtra por oferta", async ({ page, context }) => {
    const errors = trackErrors(page);
    await loginAs(context, rec.token);
    await page.goto("/#/applicants");
    await expect(column(page, "Postulado").locator(".kanban-card")).toHaveCount(3);
    await expect(column(page, "Postulado").locator(".kanban-count")).toHaveText("3");
    await expect(column(page, "Rechazado")).toContainText("Nada por aquí");

    await page.locator(".kanban-filter").selectOption(String(jobB.id));
    await expect(page.locator(".kanban-card")).toHaveCount(1);
    await page.locator(".kanban-filter").selectOption("");
    await expect(page.locator(".kanban-card")).toHaveCount(3);
    await expectAccessible(page, "Postulantes (Kanban)");
    expect(errors).toEqual([]);
});

test("cambiar el estado con el desplegable mueve la tarjeta", async ({ page, context }) => {
    await loginAs(context, rec.token);
    await page.goto("/#/applicants");
    const select = cardOf(page, cand1.name, jobA).getByRole("combobox", { name: `Estado: ${cand1.name}` });
    await expect(select.locator("option"), "la empresa no puede devolver a 'Interesa'").toHaveText(["Postulado", "En entrevista", "Oferta recibida", "Rechazado"]);
    await select.selectOption({ label: "En entrevista" });
    await expect(page.getByText("Estado actualizado. El candidato lo verá reflejado.")).toBeVisible();
    await expect(column(page, "En entrevista").locator(".kanban-card", { hasText: cand1.name })).toBeVisible();
});

test("arrastrar una tarjeta a otra columna guarda el estado", async ({ page, context }) => {
    await loginAs(context, rec.token);
    await page.goto("/#/applicants");
    await cardOf(page, cand2.name, jobA).dragTo(column(page, "Rechazado"));
    await expect(column(page, "Rechazado").locator(".kanban-card", { hasText: cand2.name })).toBeVisible();
    await expect(page.getByText("Estado actualizado. El candidato lo verá reflejado.")).toBeVisible();

    await page.reload();
    await expect(column(page, "Rechazado").locator(".kanban-card", { hasText: cand2.name })).toBeVisible();
    const apps = (await api("GET", "/applications", { token: cand2.token })).data;
    expect(apps.find((a) => a.job_offer_id === jobA.id).status).toBe("rejected");
});

test("la candidata ve la novedad en Inicio y en su tablero, que es de solo lectura", async ({ page, context }) => {
    const errors = trackErrors(page);
    await loginAs(context, cand1.token);
    await page.goto("/#/");
    const unseen = page.locator(".stat-card", { hasText: "Actualizaciones sin ver" });
    await expect(unseen.locator(".stat-value")).toHaveText("1");

    await page.goto("/#/applications");
    const card = column(page, "En entrevista").locator(".kanban-card", { hasText: jobA.title });
    await expect(card).toContainText("¡Actualizado por la empresa!");
    await expect(card, "no se puede arrastrar").not.toHaveClass(/kanban-card--draggable/);
    await expect(card.getByRole("combobox"), "sin desplegable: el estado lo lleva la empresa").toHaveCount(0);
    await expect(page.getByText("El estado de tus postulaciones lo actualiza la empresa.")).toBeVisible();
    await expectAccessible(page, "Mis postulaciones (Kanban)");

    await page.goto("/#/");
    await expect(page.locator(".stat-row")).toBeVisible();
    await expect(page.locator(".stat-card", { hasText: "Actualizaciones sin ver" }), "abrir Mis postulaciones la marca como vista").toHaveCount(0);
    expect(errors).toEqual([]);
});

test("notas privadas: se guardan y la empresa no las ve", async ({ page, context }) => {
    await loginAs(context, cand1.token);
    await page.goto("/#/applications");
    await page.getByRole("button", { name: "Ver notas" }).click();
    const card = page.locator(".card-content", { hasText: jobA.title });
    await card.locator("textarea").fill("Nota privada de prueba");
    await card.getByRole("button", { name: "Guardar nota" }).click();
    await expect(page.locator(".card-content", { hasText: jobA.title }).locator("textarea")).toHaveValue("Nota privada de prueba");
    const recView = (await api("GET", "/applications/recruiter", { token: rec.token })).data;
    expect(JSON.stringify(recView)).not.toContain("Nota privada de prueba");
});

test("retirar una postulación (diálogo propio) la quita también para la empresa", async ({ page, context }) => {
    await loginAs(context, cand2.token);
    await page.goto("/#/applications");
    const card = page.locator(".kanban-card", { hasText: jobB.title });
    await card.getByRole("button", { name: "Retirar postulación" }).click();
    const dialog = page.locator("dialog.hf-dialog");
    await expect(dialog).toContainText("¿Retirar esta postulación?");
    await dialog.getByRole("button", { name: "Sí, retirar" }).click();
    await expect(page.locator(".kanban-card", { hasText: jobB.title })).toHaveCount(0);
    const recView = (await api("GET", "/applications/recruiter", { token: rec.token })).data;
    expect(recView.some((a) => a.job_offer_id === jobB.id)).toBe(false);
});

test("el tablero a 320px no desborda la página", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 320, height: 800 } });
    await loginAs(context, rec.token);
    const page = await context.newPage();
    await page.goto("/#/applicants");
    await expect(page.locator(".kanban-card").first()).toBeVisible();
    await expectNoHorizontalScroll(page);
    await context.close();
});
