// CV del candidato en la interfaz: Mi perfil, chat, postulación con la
// casilla de CV y ficha de la empresa (docs/decisions.md, entrada 033).
import { test, expect } from "@playwright/test";
import { TestData, loginAs, trackErrors, expectAccessible, expectNoHorizontalScroll } from "../helpers.js";

test.describe.configure({ mode: "serial" });

const data = new TestData();
let cand, rec, job;

test.beforeAll(async () => {
    [cand, rec] = await Promise.all([data.user("candidate", "e2e_cv_c"), data.user("recruiter", "e2e_cv_r")]);
    const company = await data.company(rec);
    job = await data.job(rec, company, { skills_required: "Node.js, MySQL" });
});

test.afterAll(async () => { await data.cleanup(); });

test("la candidata rellena, guarda y recupera su CV", async ({ page, context }) => {
    const errors = trackErrors(page);
    await loginAs(context, cand.token);
    await page.goto("/#/profile");
    const cvForm = page.locator("form", { hasText: "Mi CV" });
    await expect(cvForm).toBeVisible();

    await page.fill("textarea[name=about]", "Desarrolladora backend\ncon ganas de aprender");
    await page.fill("textarea[name=skills]", "Node.js, MySQL, Docker");
    await page.fill("textarea[name=work_experience]", "2 años en Acme");
    await page.fill("textarea[name=education]", "Grado en Informática");

    // Una URL no válida la bloquea ya el navegador (input type=url)
    await page.fill("input[name=resume_url]", "no-es-una-url");
    await cvForm.locator("button[type=submit]").click();
    expect(await page.locator("input[name=resume_url]").evaluate((i) => i.checkValidity())).toBe(false);
    await expect(page.getByText("CV guardado correctamente")).toHaveCount(0);

    await page.fill("input[name=resume_url]", "https://example.com/cv.pdf");
    await cvForm.locator("button[type=submit]").click();
    await expect(page.getByText("CV guardado correctamente")).toBeVisible();

    await page.reload();
    await expect(page.locator("textarea[name=skills]")).toHaveValue("Node.js, MySQL, Docker");
    await expectAccessible(page, "Mi perfil + Mi CV");
    expect(errors).toEqual([]);
});

test("Mi perfil a 320px, sin desbordamiento", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 320, height: 800 } });
    await loginAs(context, cand.token);
    const page = await context.newPage();
    await page.goto("/#/profile");
    await expect(page.locator("textarea[name=skills]")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await context.close();
});

test("el asistente compara la oferta con el CV", async ({ page, context }) => {
    await loginAs(context, cand.token);
    await page.goto("/#/ai");
    const input = page.locator("input[type=text]").last();
    await input.fill(`¿encajo en la oferta ${job.title}?`);
    await input.press("Enter");
    await expect(page.getByText("Comparado con las habilidades de tu CV.")).toBeVisible();
});

test("al postularse, la casilla de compartir el CV es opcional y está desmarcada", async ({ page, context }) => {
    const errors = trackErrors(page);
    await loginAs(context, cand.token);
    await page.goto("/#/jobs");
    await page.locator(".card-content", { hasText: job.title }).getByRole("button", { name: "Postularme" }).click();
    const dialog = page.locator("dialog.hf-dialog");
    const boxes = dialog.locator("input[type=checkbox]");
    await expect(boxes).toHaveCount(2);
    await expect(boxes.nth(1)).not.toBeChecked();
    await expect(dialog.getByText("Acepto que la empresa vea también mi CV (opcional)")).toBeVisible();
    await expectAccessible(page, "diálogo de postulación");

    await boxes.nth(0).check();
    await boxes.nth(1).check();
    await dialog.locator("input[type=text]").fill(cand.name);
    await dialog.getByRole("button", { name: "Confirmar postulación" }).click();
    await expect(dialog).toHaveCount(0);
    expect(errors).toEqual([]);
});

test("la empresa ve el CV en Postulantes", async ({ page, context }) => {
    await loginAs(context, rec.token);
    await page.goto("/#/applicants");
    const card = page.locator(".card-content", { hasText: cand.name });
    await card.getByRole("button", { name: "Ver perfil" }).click();
    const cv = card.locator(".applicant-cv");
    await expect(cv).toContainText("Node.js, MySQL, Docker");
    await expect(cv).toContainText("2 años en Acme");
    expect(await cv.innerText()).toContain("backend\ncon ganas"); // respeta los saltos de línea
    const link = cv.locator("a");
    await expect(link).toHaveAttribute("href", "https://example.com/cv.pdf");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expectAccessible(page, "Postulantes con el CV desplegado");
});

test("la candidata elimina su CV (con diálogo propio) y la empresa ve el aviso", async ({ page, context, browser }) => {
    await loginAs(context, cand.token);
    await page.goto("/#/profile");
    await page.locator("form button", { hasText: "Eliminar CV" }).click();
    const dialog = page.locator("dialog.hf-dialog");
    await expect(dialog).toContainText("Tu cuenta no se borra");
    await expectAccessible(page, "diálogo de eliminar CV");
    await dialog.locator("button.primary-button").click();
    await expect(page.getByText("CV eliminado")).toBeVisible();
    await expect(page.locator("textarea[name=skills]")).toHaveValue("");

    const recContext = await browser.newContext();
    await loginAs(recContext, rec.token);
    const recPage = await recContext.newPage();
    await recPage.goto("/#/applicants");
    await recPage.locator(".card-content", { hasText: cand.name }).getByRole("button", { name: "Ver perfil" }).click();
    await expect(recPage.getByText("ha aceptado compartir su CV, pero todavía no lo ha rellenado")).toBeVisible();
    await recContext.close();
});

test("un recruiter no tiene sección de CV; en inglés se traduce", async ({ browser }) => {
    const recContext = await browser.newContext();
    await loginAs(recContext, rec.token);
    const recPage = await recContext.newPage();
    await recPage.goto("/#/profile");
    await expect(recPage.locator("input[name=name]")).toBeVisible();
    await expect(recPage.getByText("Mi CV")).toHaveCount(0);
    await recContext.close();

    const enContext = await browser.newContext();
    await loginAs(enContext, cand.token, "en");
    const enPage = await enContext.newPage();
    await enPage.goto("/#/profile");
    await expect(enPage.getByText("My CV")).toBeVisible();
    await enContext.close();
});
