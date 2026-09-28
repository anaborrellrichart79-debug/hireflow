import express from "express";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import userRoutes from "./routes/userRoutes.js";
import applicationRouter from "./routes/applicationRoutes.js";
import companyRouter from "./routes/companyRoutes.js";
import jobOfferRouter from "./routes/jobOfferRoutes.js";
import interviewRouter from "./routes/interviewRoutes.js";
import calendarRouter from "./routes/calendarRoutes.js";
import aiRouter from "./routes/aiRoutes.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import { langMiddleware } from "./i18n/index.js";
import dotenv from "dotenv";

dotenv.config();

// Sin JWT_SECRET la app arrancaba, pero cada login fallaba con un 500 poco
// claro. Mejor parar al arrancar y decir qué falta (ver backend/.env.example).
if (!process.env.JWT_SECRET) {
    console.error("Falta JWT_SECRET en backend/.env (ver backend/.env.example).");
    process.exit(1);
}

const PORT = Number(process.env.PORT) || 3000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Detrás de un proxy (el servidor de despliegue), la IP real del usuario
// llega en X-Forwarded-For. Sin esto, el límite de intentos de login
// contaría a todos los usuarios como la misma IP (la del proxy). Solo se
// activa con TRUST_PROXY (número de proxies delante, normalmente 1): si se
// activara sin proxy, cualquiera podría falsear esa cabecera y saltarse el
// límite. Ver docs/decisions.md, entrada 042.
const parseTrustProxy = (value) => {
    if (value === undefined || value === "" || value === "false") return false;
    if (value === "true") return true;
    return /^\d+$/.test(value) ? Number(value) : value;
};
app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY));

// Cabeceras de seguridad (CSP, nosniff, anti-clickjacking, sin X-Powered-By...).
// La CSP de helmet se ajusta a lo que carga el frontend: todo desde el propio
// servidor salvo la fuente Lato de Google Fonts. upgrade-insecure-requests se
// desactiva porque la app se sirve por http (localhost o la IP de la red local
// al probar en el móvil) y forzaría https en todas las peticiones.
// Ver docs/decisions.md, entrada 021.
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            styleSrc: ["'self'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            upgradeInsecureRequests: null
        }
    }
}));

// Idioma de la respuesta (Accept-Language) antes que nada más: así hasta un
// JSON mal formado recibe el error traducido. Ver docs/decisions.md, entrada 038.
app.use(langMiddleware);
app.use(express.json());

// El frontend se sirve desde el mismo servidor Express (mismo origen que
// /api/*), así se evita tener que configurar CORS -- el frontend hace
// fetch a rutas relativas ("/api/...") y el navegador nunca las trata como
// cross-origin. El routing de pantallas es client-side (hash), así que no
// hace falta ningún fallback especial aquí para rutas desconocidas.
// /.well-known/ (security.txt; en el futuro, assetlinks.json para la app de
// Android) va aparte: express.static ignora las carpetas que empiezan por punto.
app.use("/.well-known", express.static(path.join(__dirname, "../frontend/.well-known")));
app.use(express.static(path.join(__dirname, "../frontend")));

app.use("/api/applications", applicationRouter);
app.use("/api/companies", companyRouter);
app.use("/api/jobs", jobOfferRouter);
app.use("/api/interviews", interviewRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/ai", aiRouter);

//user API routes
app.use("/api/users", userRoutes);

// Una URL que no existe fuera de la API, abierta en el navegador, recibe la
// página 404 (el maletín buscando) en vez del JSON de error. La API sigue
// respondiendo JSON. Ver docs/decisions.md, entrada 036.
app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api/") && req.accepts("html")) {
        return res.status(404).sendFile(path.join(__dirname, "../frontend/404.html"));
    }
    next();
});

// Deben registrarse después de todas las rutas: notFound captura cualquier
// ruta no definida, errorHandler es el manejador final de errores (4 params).
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`HireFlow corriendo en http://localhost:${PORT}`);
});