// Ofertas: formulario de la empresa, tarjetas, buscador y filtros, postularse
// y borrar (docs/decisions.md, entradas 011, 012, 019, 027 y 030).
import { test, expect } from "@playwright/test";
import { TestData, api, uniqueId, loginAs, trackErrors, expectAccessible, expectNoHorizontalScroll } from "../helpers.js";

test.describe.configure({ mode: "serial" });

const data = new TestData();
const tag = `zeta${uniqueId()}`; // palabra única para que el buscador solo encuentre estas ofertas
let rec, cand, company, designJob, backendJob;

test.beforeAll(async () => {
    [rec, cand] = await Promise.all([data.user("recruiter", "e2e_jobs_r"), data.user("candidate", "e2e_jobs_c")]);
    company = await data.company(rec);
    designJob = await data.job(rec, company, { title: `Diseñadora UX ${tag}`, location: "Valencia (híbrido)", employment_type: "full_time", salary: "1900", skills_required: "Figma, Sketch, Research, Prototipado, Accesibilidad" });
    backendJob = await data.job(rec, company, { title: `Backend Node ${tag}`, location: "Madrid", employment_type: "part_time", skills_required: "Node.js" });
});

test.afterAll(async () => { await data.cleanup(); });

test("la empresa crea una oferta desde el formulario, con una empresa nueva", async ({ page, context }) => {
    const errors = trackErrors(page);
    await loginAs(context, rec.token);
    await page.goto("/#/jobs");
    await page.getByRole("button", { name: "+ Nueva oferta" }).click();
    await expect(page.getByRole("heading", { name: "Crear oferta laboral" })).toBeVisible();

    const newCompany = `PW Nueva ${tag}`;
    await page.getByPlaceholder("Nombre de la nueva empresa").fill(newCompany);
    await page.getByPlaceholder("Email de contacto de la empresa").fill(`pw_new_${tag}@test.local`);
    await page.locator("input[name=title]").fill(`Formulario ${tag}`);
    await page.locator("input[name=location]").fill("Sevilla");
    await page.getByRole("button", { name: "Indefinido" }).click();
    await page.getByRole("button", { name: "2200€ brutos" }).click();
    await expect(page.getByRole("button", { name: "2200€ brutos" })).toHaveClass(/active/);
    await page.locator("input[name=skills_required]").fill("SQL, Excel");
    await expectAccessible(page, "formulario de oferta");
    await page.getByRole("button", { name: "Crear oferta" }).click();

    const card = page.locator(".job-card", { hasText: `Formulario ${tag}` });
    await expect(card).toBeVisible();
    await expect(card).toContainText(newCompany);
    await expect(card.locator(".salary-chip")).toHaveText("2200€ brutos");
    await expect(card.getByRole("button", { name: "0 postulantes" })).toBeVisible();

    // Lo creado desde la interfaz también se borra al final
    const jobs = (await api("GET", "/jobs", { token: rec.token })).data.filter((j) => j.title === `Formulario ${tag}`);
    jobs.forEach((j) => data.jobs.push({ id: j.id, token: rec.token }));
    const companies = (await api("GET", "/companies", { token: rec.token })).data.filter((c) => c.name === newCompany);
    companies.forEach((c) => data.companies.push({ id: c.id, token: rec.token }));
    expect(errors).toEqual([]);
});

test("editar una oferta conserva sus datos y guarda el cambio", async ({ page, context }) => {
    await loginAs(context, rec.token);
    await page.goto("/#/jobs");
    await page.locator(".job-card", { hasText: backendJob.title }).getByRole("button", { name: "Editar" }).click();
    await expect(page.getByRole("heading", { name: "Editar oferta laboral" })).toBeVisible();
    await expect(page.locator("input[name=location]")).toHaveValue("Madrid");
    await page.locator("input[name=title]").fill(`Backend Node senior ${tag}`);
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.locator(".job-card", { hasText: `Backend Node senior ${tag}` })).toBeVisible();
    backendJob.title = `Backend Node senior ${tag}`;
});

test("la candidata ve tarjetas completas y busca sin tildes", async ({ page, context }) => {
    const errors = trackErrors(page);
    await loginAs(context, cand.token);
    await page.goto("/#/jobs");

    const card = page.locator(".job-card", { hasText: designJob.title });
    await expect(card.locator("h3")).toHaveText(designJob.title);
    await expect(card).toContainText(company.name);
    await expect(card.locator(".salary-chip")).toHaveText("1900€ brutos");
    await expect(card.locator(".skill-chip")).toHaveText(["Figma", "Sketch", "Research", "Prototipado", "+1"]);
    await expect(card).toContainText(/Publicada/);

    const search = page.locator(".job-search");
    await search.fill(`disenadora ${tag}`);
    await expect(page.locator(".job-card")).toHaveCount(1);
    await expect(page.locator(".job-results-count")).toHaveText("1 oferta");
    await expect(search, "el buscador no pierde el foco al filtrar").toBeFocused();

    // Las dos de beforeAll y la creada desde el formulario
    await search.fill(tag);
    await expect(page.locator(".job-card")).toHaveCount(3);
    await page.getByRole("combobox", { name: "Todas las ubicaciones" }).selectOption("Valencia");
    await expect(page.locator(".job-card")).toHaveCount(1);
    await page.getByRole("combobox", { name: "Todas las ubicaciones" }).selectOption("");
    await page.getByRole("combobox", { name: "Todos los contratos" }).selectOption({ label: "Media Jornada" });
    await expect(page.locator(".job-card")).toHaveCount(1);
    await expect(page.locator(".job-card h3")).toHaveText(backendJob.title);

    await search.fill(`${tag} inexistente`);
    await expect(page.getByText("Ninguna oferta coincide con tu búsqueda.")).toBeVisible();
    await page.getByRole("button", { name: "Quitar filtros" }).click();
    await expect(search).toHaveValue("");
    await expectAccessible(page, "Ofertas (candidata)");
    expect(errors).toEqual([]);
});

test("postularse deja la oferta como 'Ya postulado' y la empresa ve el recuento", async ({ page, context, browser }) => {
    await loginAs(context, cand.token);
    await page.goto("/#/jobs");
    const card = page.locator(".job-card", { hasText: designJob.title });
    await card.getByRole("button", { name: "Postularme" }).click();
    const dialog = page.locator("dialog.hf-dialog");
    await dialog.getByRole("button", { name: "Confirmar postulación" }).click();
    await expect(dialog.locator(".error-banner"), "sin la casilla no deja postularse").toBeVisible();
    await dialog.locator("input[type=checkbox]").first().check();
    await dialog.getByRole("button", { name: "Confirmar postulación" }).click();
    await expect(dialog.locator(".error-banner"), "ni sin firma").toContainText("Escribe tu nombre");
    await dialog.locator("input[type=text]").fill(cand.name);
    await dialog.getByRole("button", { name: "Confirmar postulación" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(card.getByText("Ya postulado")).toBeVisible();
    await expect(card.getByRole("button", { name: "Postularme" })).toHaveCount(0);

    const recContext = await browser.newContext();
    await loginAs(recContext, rec.token);
    const recPage = await recContext.newPage();
    await recPage.goto("/#/jobs");
    const count = recPage.locator(".job-card", { hasText: designJob.title }).getByRole("button", { name: "1 postulante" });
    await count.click();
    await expect(recPage).toHaveURL(/#\/applicants$/);
    await expect(recPage.locator(".kanban-filter")).toHaveValue(String(designJob.id));
    await recContext.close();
});

test("borrar una oferta pide confirmación con un diálogo propio", async ({ page, context }) => {
    await loginAs(context, rec.token);
    await page.goto("/#/jobs");
    const card = page.locator(".job-card", { hasText: backendJob.title });
    await card.getByRole("button", { name: "Eliminar" }).click();
    const dialog = page.locator("dialog.hf-dialog");
    await expect(dialog).toContainText("¿Eliminar esta oferta?");
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Eliminar" }).click();
    await dialog.locator("button.primary-button").click();
    await expect(page.locator(".job-card", { hasText: backendJob.title })).toHaveCount(0);
    data.jobs = data.jobs.filter((j) => j.id !== backendJob.id);
});

test("Mis ofertas solo muestra las propias; y a 320px no hay desbordamiento", async ({ browser }) => {
    const other = await data.user("recruiter", "e2e_jobs_r2");
    const context = await browser.newContext({ viewport: { width: 320, height: 800 } });
    await loginAs(context, other.token);
    const page = await context.newPage();
    await page.goto("/#/jobs");
    await expect(page.getByText("Todavía no has publicado ninguna oferta.")).toBeVisible();
    await expect(page.locator(".job-card", { hasText: tag })).toHaveCount(0);
    await expectNoHorizontalScroll(page);
    await context.close();
});
