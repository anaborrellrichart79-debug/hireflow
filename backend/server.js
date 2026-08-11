import express from "express";
import userRoutes from "./routes/userRoutes.js";
import applicationRouter from "./routes/applicationRoutes.js";
import companyRouter from "./routes/companyRoutes.js";
import jobOfferRouter from "./routes/jobOfferRoutes.js";
import interviewRouter from "./routes/interviewRoutes.js";
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

app.listen(3000, () => {
    console.log(" HireFlow corriendo en http://localhost:3000 ");
});