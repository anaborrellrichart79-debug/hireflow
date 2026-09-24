import { db } from "../config/database.js";

export const createApplication = async (applicationData) => {
    const {
        user_id,
        job_offer_id = null,
        status = "wishlist",
        notes = null,
        consent_share_contact = false,
        signature_name = null
    } = applicationData;

    const appliedDate = status === "applied" ? new Date() : null;
    const consentAt = consent_share_contact ? new Date() : null;

    const [ result ] = await db.execute(
        `
        INSERT INTO applications (
        user_id,
        job_offer_id,
        status,
        notes,
        applied_date,
        consent_share_contact,
        signature_name,
        consent_at
        )
        VALUES (?,?,?,?,?,?,?,?)
        `,
        [user_id, job_offer_id, status, notes, appliedDate, consent_share_contact, signature_name, consentAt]
    );
    return {
        id: result.insertId,
        user_id,
        job_offer_id,
        status,
        notes,
        applied_date: appliedDate,
        consent_share_contact,
        signature_name,
        consent_at: consentAt
    };
};

export const getApplicationByUser = async (userId) => {
    const [rows] = await db.execute( 
        `
        SELECT * FROM applications WHERE user_id = ?
        ORDER BY created_at DESC
        `,
        [userId]
    );
    return rows;
};

export const getApplicationById = async (id, userId) => {
    const [rows] = await db.execute(
        `
        SELECT * FROM applications
        WHERE id = ? AND user_id = ?
        `, 
        [id, userId]
    );

    return rows[0];
};

// Actualización del propio candidato. Las notas siempre se pueden cambiar.
// El estado solo en seguimientos personales (sin oferta de HireFlow): en una
// postulación a una oferta el estado lo mueve la empresa (ver
// updateApplicationStatusByRecruiter), y el candidato solo puede retirarla.
// Enviar el mismo estado que ya tiene no cuenta como cambio (así el cliente
// puede reenviar la postulación entera sin que falle).
// Devuelve null si no se envía ningún campo.
export const updateApplication = async (id, userId, { status, notes }) => {
    const sets = [];
    const params = [];

    if (notes !== undefined) {
        sets.push("notes = ?");
        params.push(notes);
    }

    let statusCheck = "";
    const statusParams = [];
    if (status !== undefined) {
        // Solo se marca como cambio del candidato si el estado cambia de verdad:
        // guardar una nota no debe borrar el aviso de "actualizado por la empresa".
        sets.push(
            "status_updated_by = IF(status <> ?, 'candidate', status_updated_by)",
            "applied_date = IF(? = 'applied' AND applied_date IS NULL, CURDATE(), applied_date)",
            "status = ?"
        );
        params.push(status, status, status);
        statusCheck = "AND (job_offer_id IS NULL OR status = ?)";
        statusParams.push(status);
    }

    if (sets.length === 0) {
        return null;
    }

    const [result] = await db.execute(
        `UPDATE applications SET ${sets.join(", ")} WHERE id = ? AND user_id = ? ${statusCheck}`,
        [...params, id, userId, ...statusParams]
    );
    return result;
};

export const deleteApplication = async (id, userId) => {
    const [result] = await db.execute(
        `
        DELETE FROM applications
        WHERE id = ? AND user_id = ?
        `,
        [id, userId]
    );

    return result;
};

// El estado lo puede mover tanto el candidato (updateApplication, arriba)
// como la empresa que publicó la oferta -- aquí la propiedad se comprueba
// vía el JOIN con job_offers.created_by_user, no con applications.user_id
// (ese es el candidato, no quien puede llamar a este endpoint).
// Las notas privadas del candidato (applications.notes) quedan fuera a
// propósito: la empresa no debe poder leerlas ni sobreescribirlas.
export const updateApplicationStatusByRecruiter = async (id, recruiterId, status) => {
    const [result] = await db.execute(
        `
        UPDATE applications a
        JOIN job_offers j ON a.job_offer_id = j.id
        SET a.status = ?,
            a.status_updated_by = 'recruiter',
            a.status_seen_by_candidate = 0,
            a.applied_date = CASE
                WHEN ? = 'applied' AND a.applied_date IS NULL THEN CURDATE()
                ELSE a.applied_date
            END
        WHERE a.id = ? AND j.created_by_user = ?
        `,
        [status, status, id, recruiterId]
    );
    return result;
};

// Vista de la empresa: todas las postulaciones recibidas en sus propias
// ofertas (nunca las de otro recruiter -- de ahí el WHERE j.created_by_user).
// email/phone del candidato solo se exponen si dio su consentimiento al
// postularse (consent_share_contact) -- comprobado aquí, no solo en el
// frontend, para que no dependa de que el cliente respete el flag.
// Las notas privadas del candidato (a.notes) nunca se incluyen.
export const getApplicationsForRecruiter = async (recruiterId, jobOfferId = null) => {
    const params = [recruiterId];
    let jobFilter = "";
    if (jobOfferId) {
        jobFilter = "AND a.job_offer_id = ?";
        params.push(jobOfferId);
    }

    const [rows] = await db.execute(
        `
        SELECT
            a.id,
            a.job_offer_id,
            a.status,
            a.status_updated_by,
            a.applied_date,
            a.consent_share_contact,
            a.signature_name,
            a.created_at,
            j.title AS job_title,
            u.id AS candidate_id,
            u.name AS candidate_name,
            u.sector AS candidate_sector,
            u.location AS candidate_location,
            CASE WHEN a.consent_share_contact = 1 THEN u.email ELSE NULL END AS candidate_email,
            CASE WHEN a.consent_share_contact = 1 THEN u.phone ELSE NULL END AS candidate_phone
        FROM applications a
        JOIN job_offers j ON a.job_offer_id = j.id
        JOIN users u ON a.user_id = u.id
        WHERE j.created_by_user = ? ${jobFilter}
        ORDER BY a.created_at DESC
        `,
        params
    );
    return rows;
};

export const markApplicationStatusUpdatesSeen = async (userId) => {
    const [result] = await db.execute(
        `UPDATE applications SET status_seen_by_candidate = 1 WHERE user_id = ? AND status_seen_by_candidate = 0`,
        [userId]
    );
    return result;
};