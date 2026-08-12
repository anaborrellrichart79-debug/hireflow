import { db } from "../config/database.js";

// La tabla interviews no tiene user_id propio — su dueño es el usuario de la
// application a la que pertenece (interviews.application_id -> applications.user_id).
// Igual que en Applications (docs/decisions.md, entrada 001), la propiedad se filtra
// siempre en la propia query SQL (vía JOIN), nunca comprobando en el controller
// después de leer el registro.

export const createInterview = async (interviewData, userId) => {
    const {
        application_id,
        interview_type_id = null,
        scheduled_date,
        location = null,
        notes = null
    } = interviewData;

    // El INSERT ... SELECT solo inserta si la application indicada pertenece
    // al usuario autenticado — evita que alguien agende una entrevista sobre
    // una postulación ajena pasando un application_id que no es suyo.
    const [result] = await db.execute(
        `
        INSERT INTO interviews (application_id, interview_type_id, scheduled_date, location, notes)
        SELECT ?, ?, ?, ?, ?
        FROM applications
        WHERE id = ? AND user_id = ?
        `,
        [application_id, interview_type_id, scheduled_date, location, notes, application_id, userId]
    );

    if (result.affectedRows === 0) {
        return null;
    }

    return {
        id: result.insertId,
        application_id,
        interview_type_id,
        scheduled_date,
        location,
        notes
    };
};

// Variante para recruiters: la propiedad de una entrevista, cuando la crea
// la empresa, se comprueba vía el JOIN hasta job_offers.created_by_user en
// vez de applications.user_id (ese es el candidato, no la empresa) --
// mismo patrón que application.js's updateApplicationStatusByRecruiter.
export const createInterviewForRecruiter = async (interviewData, recruiterId) => {
    const {
        application_id,
        interview_type_id = null,
        scheduled_date,
        location = null,
        notes = null
    } = interviewData;

    const [result] = await db.execute(
        `
        INSERT INTO interviews (application_id, interview_type_id, scheduled_date, location, notes)
        SELECT ?, ?, ?, ?, ?
        FROM applications a
        JOIN job_offers j ON a.job_offer_id = j.id
        WHERE a.id = ? AND j.created_by_user = ?
        `,
        [application_id, interview_type_id, scheduled_date, location, notes, application_id, recruiterId]
    );

    if (result.affectedRows === 0) {
        return null;
    }

    return {
        id: result.insertId,
        application_id,
        interview_type_id,
        scheduled_date,
        location,
        notes
    };
};

export const getInterviewsForRecruiter = async (recruiterId) => {
    const [rows] = await db.execute(
        `
        SELECT i.*, a.job_offer_id, j.title AS job_title, u.name AS candidate_name
        FROM interviews i
        JOIN applications a ON i.application_id = a.id
        JOIN job_offers j ON a.job_offer_id = j.id
        JOIN users u ON a.user_id = u.id
        WHERE j.created_by_user = ?
        ORDER BY i.scheduled_date ASC
        `,
        [recruiterId]
    );
    return rows;
};

export const deleteInterviewForRecruiter = async (id, recruiterId) => {
    const [result] = await db.execute(
        `
        DELETE i FROM interviews i
        JOIN applications a ON i.application_id = a.id
        JOIN job_offers j ON a.job_offer_id = j.id
        WHERE i.id = ? AND j.created_by_user = ?
        `,
        [id, recruiterId]
    );

    return result;
};

export const getInterviewsByUser = async (userId) => {
    const [rows] = await db.execute(
        `
        SELECT i.* FROM interviews i
        JOIN applications a ON i.application_id = a.id
        WHERE a.user_id = ?
        ORDER BY i.scheduled_date ASC
        `,
        [userId]
    );
    return rows;
};

export const getInterviewById = async (id, userId) => {
    const [rows] = await db.execute(
        `
        SELECT i.* FROM interviews i
        JOIN applications a ON i.application_id = a.id
        WHERE i.id = ? AND a.user_id = ?
        `,
        [id, userId]
    );
    return rows[0];
};

// application_id queda fuera a propósito: reasignar una entrevista a otra
// postulación necesitaría revalidar la propiedad de esa otra application,
// igual que en la creación — no se contempla en un update de campos simples.
const UPDATABLE_FIELDS = ["interview_type_id", "scheduled_date", "location", "notes"];

export const updateInterview = async (id, userId, interviewData) => {
    const fieldsToUpdate = UPDATABLE_FIELDS.filter(
        (field) => interviewData[field] !== undefined
    );

    if (fieldsToUpdate.length === 0) {
        return null;
    }

    const setClause = fieldsToUpdate.map((field) => `i.${field} = ?`).join(", ");
    const values = fieldsToUpdate.map((field) => interviewData[field]);

    const [result] = await db.execute(
        `
        UPDATE interviews i
        JOIN applications a ON i.application_id = a.id
        SET ${setClause}
        WHERE i.id = ? AND a.user_id = ?
        `,
        [...values, id, userId]
    );

    return result;
};

export const deleteInterview = async (id, userId) => {
    const [result] = await db.execute(
        `
        DELETE i FROM interviews i
        JOIN applications a ON i.application_id = a.id
        WHERE i.id = ? AND a.user_id = ?
        `,
        [id, userId]
    );

    return result;
};
