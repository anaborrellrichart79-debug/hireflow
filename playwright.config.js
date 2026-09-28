// Pruebas automáticas de HireFlow (ver docs/decisions.md, entrada 040).
// Un solo ejecutor para la API (tests/api) y la interfaz (tests/e2e): arranca
// el servidor si no está ya en marcha y lanza todo contra él.
//   npm test              todas
//   npm run test:api      solo API
//   npm run test:e2e      solo interfaz
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT) || 3000;

export default defineConfig({
    testDir: "tests",
    // Los archivos corren en paralelo; las pruebas de un mismo archivo, en
    // orden (cada archivo es un flujo que comparte usuarios y datos).
    fullyParallel: false,
    workers: process.env.CI ? 2 : 3,
    forbidOnly: !!process.env.CI,
    reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
    timeout: 60_000,
    use: {
        baseURL: `http://localhost:${PORT}`,
        locale: "es-ES",
        trace: "retain-on-failure",
        screenshot: "only-on-failure"
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: {
        command: "npm start --prefix backend",
        url: `http://localhost:${PORT}/privacy.html`,
        // En local se reutiliza el servidor si ya está arrancado
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        stdout: "ignore",
        // El servidor registra cada 4xx con console.error (las pruebas provocan
        // muchos a propósito): en local se oculta; en CI se ve, por si no arranca
        stderr: process.env.CI ? "pipe" : "ignore"
    }
});
