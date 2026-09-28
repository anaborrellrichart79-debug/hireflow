import { db } from "../config/database.js";
import bcrypt from "bcryptjs";

// CREATE USER CON ENCRIPTADO DE CONTRASEÑA
    // crear usuario (regirtrarse)
export const createUser = async (userData) => {
    const {name, email, password, role = "candidate"} = userData;

    if (!userData.name || !userData.email || !userData.password) {
        throw new Error("nombre, email y contraseña son obligatorios");
    }

    //encriptar la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // guardar en DB -- terms_accepted_at queda registrado con la hora exacta
    // de aceptación (createUserValidators exige que termsAccepted sea true
    // antes de llegar aquí, así que en este punto siempre se acaba de aceptar)
    const [result] = await db.execute(
    "INSERT INTO users (name, email, password_hash, role, terms_accepted_at) VALUES (?, ?, ?, ?, NOW())",
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

// Hash de la contraseña, solo para confirmar operaciones delicadas (borrar la cuenta)
export const getPasswordHashById = async (id) => {
    const [rows] = await db.execute("SELECT password_hash FROM users WHERE id = ?", [id]);
    return rows[0]?.password_hash;
};

// Eliminar cuenta propia. El resto de datos personales se borra en cascada
// (CV, postulaciones, notas, eventos, contactos). Las ofertas y empresas de
// un recruiter se borran explícitamente: con ON DELETE SET NULL quedaban
// publicadas y sin nadie que las gestionara, y los candidatos seguían
// postulándose a ellas. Borrar sus ofertas borra también (en cascada) las
// postulaciones y entrevistas que habían recibido. Todo en una transacción.
// Ver docs/decisions.md, entrada 042.
export const deleteUser = async (id) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.execute("DELETE FROM job_offers WHERE created_by_user = ?", [id]);
        await connection.execute("DELETE FROM companies WHERE created_by_user = ?", [id]);
        const [result] = await connection.execute("DELETE FROM users WHERE id = ?", [id]);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};