import express from "express";
import userRoutes from "./routes/userRoutes.js";
import applicationRouter from "./routes/applicationRoutes.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());
app.use("/api/applications", applicationRouter);

//user API routes
app.use("/api/users", userRoutes);


import {db} from "./config/database.js";

const [rows] = await db.execute("SELECT DATABASE() AS database_name");
console.log("Base de datos;", rows[0].database_name);
const [apps] = await db.execute(`
    SELECT id, user_id FROM applications
    `);
    console.log("APLICATIONS:", apps)

app.listen(3000, () => {
    console.log(" HireFlow corriendo en http://localhost:3000 ");
});