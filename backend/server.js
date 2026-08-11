import express from "express";
import userRoutes from "./routes/userRoutes.js";
import applicationRouter from "./routes/applicationRoutes.js";
import companyRouter from "./routes/companyRoutes.js";
import jobOfferRouter from "./routes/jobOfferRoutes.js";
import interviewRouter from "./routes/interviewRoutes.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());
app.use("/api/applications", applicationRouter);
app.use("/api/companies", companyRouter);
app.use("/api/jobs", jobOfferRouter);
app.use("/api/interviews", interviewRouter);

//user API routes
app.use("/api/users", userRoutes);

// Deben registrarse después de todas las rutas: notFound captura cualquier
// ruta no definida, errorHandler es el manejador final de errores (4 params).
app.use(notFound);
app.use(errorHandler);

app.listen(3000, () => {
    console.log(" HireFlow corriendo en http://localhost:3000 ");
});