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
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

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

app.use(express.json());

// El frontend se sirve desde el mismo servidor Express (mismo origen que
// /api/*), así se evita tener que configurar CORS -- el frontend hace
// fetch a rutas relativas ("/api/...") y el navegador nunca las trata como
// cross-origin. El routing de pantallas es client-side (hash), así que no
// hace falta ningún fallback especial aquí para rutas desconocidas.
app.use(express.static(path.join(__dirname, "../frontend")));

app.use("/api/applications", applicationRouter);
app.use("/api/companies", companyRouter);
app.use("/api/jobs", jobOfferRouter);
app.use("/api/interviews", interviewRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/ai", aiRouter);

//user API routes
app.use("/api/users", userRoutes);

// Deben registrarse después de todas las rutas: notFound captura cualquier
// ruta no definida, errorHandler es el manejador final de errores (4 params).
app.use(notFound);
app.use(errorHandler);

app.listen(3000, () => {
    console.log(" HireFlow corriendo en http://localhost:3000 ");
});