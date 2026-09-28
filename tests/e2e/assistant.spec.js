// Asistente IA por chat: sugerencias, aclaraciones, fuera de tema, adjuntos,
// nueva conversación y 4 idiomas (docs/decisions.md, entradas 014, 015, 026 y 028).
import { test, expect } from "@playwright/test";
import { TestData, loginAs, trackErrors, expectAccessible, expectNoHorizontalScroll } from "../helpers.js";

const data = new TestData();
let cand;
test.beforeAll(async () => { cand = await data.user("candidate", "e2e_ai"); });
test.afterAll(async () => { await data.cleanup(); });

const lastAnswer = (page) => page.locator(".chat-message.chat-assistant").last();
const ask = async (page, text) => {
    const input = page.getByPlaceholder(/Escribe tu pregunta|Type your question|Écris|Scrivi/);
    await input.fill(text);
    await input.press("Enter");
};

test("una sugerencia rellena el campo y devuelve preguntas de entrevista", async ({ page, context }) => {
    const errors = trackErrors(page);
    await loginAs(context, cand.token);
    await page.goto("/#/ai");
    await expect(page.getByText("¡Hola! Pregúntame lo que quieras sobre tu búsqueda de empleo.")).toBeVisible();
    await expectAccessible(page, "Asistente IA");

    await page.getByRole("button", { name: "¿Qué me preguntarán en la entrevista?" }).click();
    await expect(page.getByPlaceholder("Escribe tu pregunta...")).toHaveValue("¿Qué me preguntarán en la entrevista?");
    await page.getByPlaceholder("Escribe tu pregunta...").press("Enter");
    await expect(lastAnswer(page)).toContainText("Preguntas sugeridas:");
    // Sin plantillas sin rellenar ni códigos internos (entrada 026)
    await expect(lastAnswer(page)).not.toContainText("[");
    await expect(lastAnswer(page)).not.toContainText(/technical|behavioral|advanced/);
    expect(errors).toEqual([]);
});

test("si falta información, pregunta; con la respuesta, contesta", async ({ page, context }) => {
    await loginAs(context, cand.token);
    await page.goto("/#/ai");
    await ask(page, "Revísame el CV");
    await expect(lastAnswer(page)).toContainText("¿En qué sector");
    await ask(page, "banca");
    await expect(lastAnswer(page)).toContainText("Guías para ti:");
});

test("fuera de tema, lo dice; 'Nueva conversación' limpia el chat", async ({ page, context }) => {
    await loginAs(context, cand.token);
    await page.goto("/#/ai");
    await ask(page, "¿qué tiempo hace hoy?");
    await expect(lastAnswer(page)).toContainText("Solo puedo ayudarte con temas de búsqueda de empleo");
    await page.getByRole("button", { name: "Nueva conversación" }).click();
    await expect(page.locator(".chat-message")).toHaveCount(0);
    await expect(page.locator(".chat-greeting")).toBeVisible();
});

test("adjuntar un archivo solo añade su nombre al mensaje (no se lee)", async ({ page, context }) => {
    await loginAs(context, cand.token);
    await page.goto("/#/ai");
    await page.locator(".chat-file-input").setInputFiles({ name: "mi-cv.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
    const chip = page.locator(".chat-file-chip");
    await expect(chip).toContainText("mi-cv.pdf");
    await expect(chip).toHaveAttribute("title", /no puedo leer el contenido/);
    await page.getByRole("button", { name: "Quitar archivo adjunto" }).click();
    await expect(chip).toHaveCount(0);

    await page.locator(".chat-file-input").setInputFiles({ name: "mi-cv.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
    await ask(page, "Revísame el CV para banca");
    await expect(page.locator(".chat-message.chat-user").last()).toContainText("mi-cv.pdf");
    await expect(lastAnswer(page)).toContainText("Guías para ti:");
});

for (const [lang, suggestion, label] of [
    ["en", "What will they ask me in the interview?", "Suggested questions:"],
    ["fr", null, null],
    ["it", null, null]
]) {
    test(`en ${lang}, sus propias sugerencias funcionan (entrada 028)`, async ({ browser }) => {
        const context = await browser.newContext();
        await loginAs(context, cand.token, lang);
        const page = await context.newPage();
        await page.goto("/#/ai");
        const chip = suggestion ? page.getByRole("button", { name: suggestion }) : page.locator(".chat-chips .pill").first();
        await chip.click();
        await page.locator(".chat-input-row input[type=text]").press("Enter");
        const answer = lastAnswer(page);
        await expect(answer.locator(".chat-card").first(), "responde con preguntas, no 'fuera de tema'").toBeVisible();
        if (label) await expect(answer).toContainText(label);
        await context.close();
    });
}

test("el chat a 320px no desborda", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 320, height: 800 } });
    await loginAs(context, cand.token);
    const page = await context.newPage();
    await page.goto("/#/ai");
    await expect(page.locator(".chat-input-row")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await context.close();
});
