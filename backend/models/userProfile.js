import { db } from "../config/database.js";

// CV extendido del candidate (tabla user_profiles, relación 1:1 con users).
// Siempre se accede por el user_id del token, nunca por un id que venga del
// cliente -- mismo criterio que /users/me (ver docs/decisions.md, entrada 002).

const PROFILE_FIELDS = ["education", "work_experience", "skills", "resume_url", "about"];

export const getUserProfileByUserId = async (userId) => {
    const [rows] = await db.execute(
        `
        SELECT id, user_id, education, work_experience, skills, resume_url, about, created_at, updated_at
        FROM user_profiles
        WHERE user_id = ?
        `,
        [userId]
    );
    return rows[0];
};

// Crea el CV si no existe o actualiza solo los campos enviados si ya existe.
// Depende del UNIQUE(user_id) de user_profiles para que sea atómico: dos
// peticiones simultáneas no pueden acabar creando dos filas para el mismo usuario.
export const upsertUserProfile = async (userId, profileData) => {
    const fieldsToSave = PROFILE_FIELDS.filter(
        (field) => profileData[field] !== undefined
    );

    if (fieldsToSave.length === 0) {
        return null;
    }

    const columns = fieldsToSave.join(", ");
    const placeholders = fieldsToSave.map(() => "?").join(", ");
    const updateClause = fieldsToSave.map((field) => `${field} = VALUES(${field})`).join(", ");
    const values = fieldsToSave.map((field) => profileData[field]);

    const [result] = await db.execute(
        `
        INSERT INTO user_profiles (user_id, ${columns})
        VALUES (?, ${placeholders})
        ON DUPLICATE KEY UPDATE ${updateClause}
        `,
        [userId, ...values]
    );

    return result;
};

export const deleteUserProfile = async (userId) => {
    const [result] = await db.execute(
        "DELETE FROM user_profiles WHERE user_id = ?",
        [userId]
    );
    return result;
};
