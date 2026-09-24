import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export const db = mysql.createPool({
    host: process.env.DB_HOST,
    // DB_PORT estaba en el .env pero no se usaba: con MySQL en otro puerto
    // la app no conectaba. Ver docs/decisions.md, entrada 029.
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});