// Retirar o volver a dar el consentimiento desde Mis postulaciones
// (docs/decisions.md, entrada 034).
import { test, expect } from "@playwright/test";
import { TestData, api, loginAs, trackErrors, expectAccessible, expectNoHorizontalScroll } from "../helpers.js";

test.describe.configure({ mode: "serial" });

const data = new TestData();
let cand, rec, job;

test.beforeAll(async () => {
    [cand, rec] = await Promise.all([data.user("candidate", "e2e_cs_c"), data.user("recruiter", "e2e_cs_r")]);
    const company = await data.company(rec);
    job = await data.job(rec, company);
    await api("PUT", "/users/me/cv", { token: cand.token, body: { skills: "Node.js" } });
    await api("POST", "/applications", { token: cand.token, body: { job_offer_id: job.id, consent: true, consent_cv: true, signature: cand.name } });
});

test.afterAll(async () => { await data.cleanup(); });

const card = (page) => page.locator(".card-content", { hasText: job.title });

test("la tarjeta resume lo que se comparte y el diálogo lo muestra", async ({ page, context }) => {
    const errors = trackErrors(page);
    await loginAs(context, cand.token);
    await page.goto("/#/applications");
    await expect(card(page)).toContainText("Compartes: contacto y CV");
    await expectAccessible(page, "Mis postulaciones");

    await card(page).getByRole("button", { name: /^Privacidad/ }).click();
    const dialog = page.locator("dialog.hf-dialog");
    const boxes = dialog.locator("input[type=checkbox]");
    await expect(boxes.nth(0)).toBeChecked();
    await expect(boxes.nth(1)).toBeChecked();
    await expect(dialog).toContainText("pídele directamente que los borre");
    await expectAccessible(page, "diálogo de privacidad");

    await dialog.locator("button.secondary-button").click();
    await expect(dialog).toHaveCount(0);
    await expect(card(page)).toContainText("Compartes: contacto y CV");
    expect(errors).toEqual([]);
});

test("retirar el contacto: la tarjeta y la empresa lo reflejan", async ({ page, context, browser }) => {
    await loginAs(context, cand.token);
    await page.goto("/#/applications");
    await card(page).getByRole("button", { name: /^Privacidad/ }).click();
    const dialog = page.locator("dialog.hf-dialog");
    await dialog.locator("input[type=checkbox]").nth(0).uncheck();
    await dialog.locator("button.primary-button").click();
    await expect(page.getByText("Permisos actualizados")).toBeVisible();
    await expect(card(page)).toContainText("Compartes: CV");
    await expect(card(page)).not.toContainText("contacto y CV");

    const recContext = await browser.newContext();
    await loginAs(recContext, rec.token);
    const recPage = await recContext.newPage();
    await recPage.goto("/#/applicants");
    const recCard = recPage.locator(".card-content", { hasText: cand.name });
    await recCard.getByRole("button", { name: "Ver perfil" }).click();
    await expect(recCard.locator(".applicant-cv")).toContainText("Node.js");
    await expect(recCard).toContainText("no ha compartido datos de contacto");
    await expect(recCard).not.toContainText(cand.email);
    await recContext.close();
});

test("a 320px y en inglés", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 320, height: 800 } });
    await loginAs(context, cand.token, "en");
    const page = await context.newPage();
    await page.goto("/#/applications");
    await expect(card(page)).toContainText("Sharing: CV");
    await expect(card(page).getByRole("button", { name: /^Privacy/ })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await context.close();
});
