// Eliminar la cuenta desde Mi perfil (docs/decisions.md, entrada 042).
import { test, expect } from "@playwright/test";
import { TestData, api, loginAs, trackErrors, expectAccessible } from "../helpers.js";

const data = new TestData();
test.afterAll(async () => { await data.cleanup(); });

for (const role of ["candidate", "recruiter"]) {
    test(`${role}: eliminar la cuenta pide la contraseña y deja en el login con un aviso`, async ({ page, context }) => {
        const user = await data.user(role, `e2e_del_${role}`);
        const errors = trackErrors(page, { ignoreHttpErrors: true });
        await loginAs(context, user.token);
        await page.goto("/#/profile");

        const section = page.locator(".danger-zone");
        await expect(section.getByRole("heading", { name: "Eliminar mi cuenta" })).toBeVisible();
        await expect(section).toContainText(role === "recruiter" ? "tus empresas y tus ofertas" : "tu CV, tus postulaciones");
        await section.getByRole("button", { name: "Eliminar mi cuenta" }).click();

        const dialog = page.locator("dialog.hf-dialog");
        await expect(dialog.getByRole("heading", { name: "¿Eliminar tu cuenta para siempre?" })).toBeVisible();
        await expectAccessible(page, `diálogo de eliminar cuenta (${role})`);

        await dialog.getByLabel("Escribe tu contraseña para confirmarlo").fill("incorrecta123");
        await dialog.getByRole("button", { name: "Eliminar mi cuenta" }).click();
        await expect(dialog.locator(".error-banner")).toHaveText("La contraseña no es correcta");
        expect(await page.evaluate(() => localStorage.getItem("hireflow_token")), "sigue con sesión").not.toBeNull();

        await dialog.getByLabel("Escribe tu contraseña para confirmarlo").fill("secret123");
        await dialog.getByRole("button", { name: "Eliminar mi cuenta" }).click();
        await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
        await expect(page.getByText("Tu cuenta y tus datos se han eliminado.")).toBeVisible();
        expect(await page.evaluate(() => localStorage.getItem("hireflow_token"))).toBeNull();
        expect((await api("GET", "/users/me", { token: user.token })).status).toBe(404);

        // El aviso sale una sola vez
        await page.reload();
        await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
        await expect(page.getByText("Tu cuenta y tus datos se han eliminado.")).toHaveCount(0);
        expect(errors).toEqual([]);
    });
}
