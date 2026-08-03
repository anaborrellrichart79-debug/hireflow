import { db } from "../config/database.js";
import bcrypt from "bcryptjs";

// GET ALL USERS
export const getAllUsers = async () => {
    const [rows] = await db.query(
        "SELECT id, name, email, role, sector, phone, location, profile_visible, created_at, updated_at FROM users"
    );
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

//Buscar usuario por email
export const findUserByEmail = async (email) => {
    const [rows]=await db.execute(`SELECT * FROM users WHERE email = ?`, [email]);
    return rows[0];
};

// Buscar usuario por id (sin password_hash) — usado por getProfile
export const getUserById = async (id) => {
    const [rows] = await db.execute(
        "SELECT id, name, email, role, sector, phone, location, profile_visible, created_at, updated_at FROM users WHERE id = ?",
        [id]
    );
    return rows[0];
};

// Actualizar perfil propio. Solo acepta campos de esta lista blanca —
// nunca se construye la query con nombres de columna que vengan del cliente.
const UPDATABLE_FIELDS = ["name", "sector", "phone", "location", "profile_visible"];

export const updateUser = async (id, userData) => {
    const fieldsToUpdate = UPDATABLE_FIELDS.filter(
        (field) => userData[field] !== undefined
    );

    if (fieldsToUpdate.length === 0) {
        return null;
    }

    const setClause = fieldsToUpdate.map((field) => `${field} = ?`).join(", ");
    const values = fieldsToUpdate.map((field) => userData[field]);

    const [result] = await db.execute(
        `UPDATE users SET ${setClause} WHERE id = ?`,
        [...values, id]
    );

    return result;
};

// Eliminar cuenta propia
export const deleteUser = async (id) => {
    const [result] = await db.execute(
        "DELETE FROM users WHERE id = ?",
        [id]
    );
    return result;
};