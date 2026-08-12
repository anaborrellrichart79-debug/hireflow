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

export const updateApplication = async (id, userId, status, notes = null) => {
    const [result] = await db.execute(
        `
        UPDATE applications
        SET status = ?,
            notes = ?,
            status_updated_by = 'candidate',
            status_seen_by_candidate = 1,
            applied_date = CASE
                WHEN ? = 'applied' AND applied_date IS NULL THEN CURDATE()
                ELSE applied_date
            END
        WHERE id = ? AND user_id = ?
        `,
        [status, notes, status, id, userId]
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