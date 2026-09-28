// Registro, login, sesión caducada y menú (docs/decisions.md, entradas 011,
// 017, 021, 025 y 029). Los logins fallidos se prueban solo por API, contra un
// servidor aparte (login-rate-limit.spec.js), para no gastar el límite de
// intentos del servidor compartido.
import { test, expect } from "@playwright/test";
import { TestData, testEmail, trackErrors, expectAccessible } from "../helpers.js";

test.describe.configure({ mode: "serial" });

const data = new TestData();
let existing;
test.beforeAll(async () => { existing = await data.user("candidate", "e2e_auth"); });
test.afterAll(async () => { await data.cleanup(); });

// JWT con la forma correcta pero caducado: el frontend lo detecta sin llamar a la API
const expiredToken = () => {
    const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
    return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ id: 1, email: "x@test.local", role: "candidate", exp: 1_000_000_000 })}.firma`;
};

test("login y registro son accesibles", async ({ page }) => {
    await page.goto("/#/login");
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
    await expectAccessible(page, "login");
    await page.locator(".auth-toggle a").click();
    await expect(page.getByRole("heading", { name: "Crear cuenta" })).toBeVisible();
    await expectAccessible(page, "registro");
});

test("registro: exige la política y una contraseña válida, y luego entra", async ({ page }) => {
    const errors = trackErrors(page);
    const email = testEmail("e2e_reg");
    await page.goto("/#/login");
    await page.locator(".auth-toggle a").click();

    await page.getByPlaceholder("Nombre").fill("PW Registro");
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Contraseña").fill("solo-letras");
    await page.getByRole("button", { name: "Registrarme" }).click();
    await expect(page.locator(".error-banner")).toHaveText("Debes aceptar la política de privacidad para registrarte");

    await page.locator("input[name=termsAccepted]").check();
    await page.getByRole("button", { name: "Registrarme" }).click();
    await expect(page.locator(".error-banner")).toHaveText(/entre 8 y 72 caracteres/);

    await page.getByPlaceholder("Contraseña").fill("secret123");
    await page.getByRole("button", { name: "Registrarme" }).click();
    await expect(page.locator(".home-welcome")).toBeVisible();

    // Para que afterAll borre la cuenta creada desde la interfaz
    const token = await page.evaluate(() => localStorage.getItem("hireflow_token"));
    data.users.push({ token, email });
    expect(errors).toEqual([]);
});

test("el registro no deja reutilizar un email", async ({ page }) => {
    await page.goto("/#/login");
    await page.locator(".auth-toggle a").click();
    await page.getByPlaceholder("Nombre").fill("PW Duplicado");
    await page.getByPlaceholder("Email").fill(existing.email);
    await page.getByPlaceholder("Contraseña").fill("secret123");
    await page.locator("input[name=termsAccepted]").check();
    await page.getByRole("button", { name: "Registrarme" }).click();
    await expect(page.locator(".error-banner")).toHaveText("El email ya está registrado");
});

test("login correcto, menú por rol y cerrar sesión", async ({ page }) => {
    await page.goto("/#/login");
    await page.getByPlaceholder("Email").fill(existing.email);
    await page.getByPlaceholder("Contraseña").fill("secret123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator(".home-welcome")).toBeVisible();

    const burger = page.getByRole("button", { name: "Abrir menú" });
    await burger.click();
    await expect(page.getByRole("button", { name: "Cerrar menú" })).toHaveAttribute("aria-expanded", "true");
    const drawer = page.locator("#nav-drawer");
    // Al abrir, el foco pasa al primer enlace del menú
    await expect(drawer.getByRole("link", { name: "Inicio", exact: true })).toBeFocused();
    for (const name of ["Inicio", "Ofertas", "Mis postulaciones", "Calendario", "Mi perfil", "Asistente IA"]) {
        await expect(drawer.getByRole("link", { name, exact: true })).toBeVisible();
    }
    await expect(drawer.getByRole("link", { name: "Postulantes" })).toHaveCount(0);

    // Escape cierra el menú y devuelve el foco al botón
    await page.keyboard.press("Escape");
    await expect(burger).toHaveAttribute("aria-expanded", "false");
    await expect(burger).toBeFocused();

    await burger.click();
    await drawer.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("hireflow_token"))).toBeNull();
});

test("sin sesión, cualquier pantalla lleva al login", async ({ page }) => {
    for (const route of ["/jobs", "/applications", "/calendar", "/profile", "/ai"]) {
        await page.goto(`/#${route}`);
        await expect(page.getByRole("heading", { name: "Iniciar sesión" }), route).toBeVisible();
    }
});

test("sesión caducada: aviso y vuelta a la pantalla donde se estaba (entrada 025)", async ({ page }) => {
    await page.goto("/#/login");
    await page.evaluate((token) => localStorage.setItem("hireflow_token", token), expiredToken());
    await page.goto("/#/calendar");
    await expect(page.getByText("Tu sesión ha caducado")).toBeVisible();
    await page.getByPlaceholder("Email").fill(existing.email);
    await page.getByPlaceholder("Contraseña").fill("secret123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/#\/calendar$/);
    await expect(page.locator(".week-title")).toBeVisible();
});

test("un recruiter ve su propio menú", async ({ page, context }) => {
    const rec = await data.user("recruiter", "e2e_auth_r");
    await context.addInitScript((tok) => localStorage.setItem("hireflow_token", tok), rec.token);
    await page.goto("/#/");
    await page.getByRole("button", { name: "Abrir menú" }).click();
    const drawer = page.locator("#nav-drawer");
    for (const name of ["Mis ofertas", "Postulantes", "Calendario", "Asistente IA"]) {
        await expect(drawer.getByRole("link", { name, exact: true })).toBeVisible();
    }
    await expect(drawer.getByRole("link", { name: "Mis postulaciones" })).toHaveCount(0);
});

test("el selector de idioma traduce la pantalla sin perder la ruta", async ({ page }) => {
    await page.goto("/#/login");
    await page.locator("#lang-switcher").selectOption("fr");
    await expect(page).toHaveURL(/#\/login$/);
    await expect(page.locator(".auth-form h2")).not.toHaveText("Iniciar sesión");
    expect(await page.evaluate(() => document.documentElement.lang)).toBe("fr");
    await page.reload();
    await expect(page.locator("#lang-switcher")).toHaveValue("fr");
    await page.locator("#lang-switcher").selectOption("es");
});
