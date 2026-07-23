import { db } from "../config/database.js";
import bcrypt from "bcryptjs";

// GET ALL USERS
export const getAllUsers = async () => {
    const [rows] = await db.query("SELECT * FROM users");
    return rows;
};

// CREATE USER CON ENCRIPTADO DE CONTRASEÑA
    // crear usuario (regirtrarse)
export const createUser = async (userData) => {
    const {name, email, password, role = "candidate"} = userData;

    if (!userData.name || !userData.email || !userData.password) {
        throw new Error("nombre, email y contraseña son obligatorios");
    }

    //encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, 10);

    // guardar en DB
    const [result] = await db.execute(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
    [name, email, passwordHash, role]
);

    return {
    id: result.insertId,
    name,
    email,
    role
    };
};

//autentificación del usuario
export const authentificateUser = async (email, password) => {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ? AND password_hash = ?", [email, password]);
    return rows[0];
};

//Buscar usuario por email
export const findUserByEmail = async (email) => {
    const [rows]=await db.execute(`SELECT * FROM users WHERE email = ?`, [email]);
    return rows[0];
};