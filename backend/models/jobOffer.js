import { db } from "../config/database.js";

export const createJobOffer = async (jobOfferData) => {
    const {
        company_id,
        title,
        description = null,
        salary = null,
        location = null,
        employment_type = null,
        skills_required = null,
        source = "internal",
        external_url = null,
        created_by_user
    } = jobOfferData;

    // El INSERT ... SELECT solo inserta si la empresa pertenece al recruiter
    // autenticado -- evita publicar ofertas a nombre de la empresa de otro
    // (mismo patrón que createInterview en interview.js).
    const [result] = await db.execute(
        `
        INSERT INTO job_offers (
            company_id, title, description, salary, location,
            employment_type, skills_required, source, external_url, created_by_user
        )
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        FROM companies
        WHERE id = ? AND created_by_user = ?
        `,
        [company_id, title, description, salary, location, employment_type, skills_required, source, external_url, created_by_user, company_id, created_by_user]
    );

    if (result.affectedRows === 0) {
        return null;
    }

    return {
        id: result.insertId,
        company_id,
        title,
        description,
        salary,
        location,
        employment_type,
        skills_required,
        source,
        external_url,
        created_by_user
    };
};

// Con el nombre de la empresa, para las tarjetas de oferta. applicants_count
// (cuántas postulaciones tiene) solo se devuelve en las ofertas del propio
// usuario que consulta: es información de la empresa, no de los candidatos.
// Ver docs/decisions.md, entrada 030.
export const getAllJobOffers = async (viewerId = null) => {
    const [rows] = await db.execute(
        `
        SELECT j.*, c.name AS company_name,
            CASE WHEN j.created_by_user = ?
                THEN (SELECT COUNT(*) FROM applications a WHERE a.job_offer_id = j.id)
            END AS applicants_count
        FROM job_offers j
        LEFT JOIN companies c ON c.id = j.company_id
        ORDER BY j.created_at DESC
        `,
        [viewerId]
    );
    return rows;
};

export const getJobOfferById = async (id) => {
    const [rows] = await db.execute(
        `
        SELECT j.*, c.name AS company_name
        FROM job_offers j
        LEFT JOIN companies c ON c.id = j.company_id
        WHERE j.id = ?
        `,
        [id]
    );
    return rows[0];
};

// Solo acepta campos de esta lista blanca — nunca se construye la query
// con nombres de columna que vengan del cliente (mismo patrón que updateCompany).
// created_by_user queda fuera a propósito: no se reasigna la autoría de una oferta desde un update.
const UPDATABLE_FIELDS = [
    "company_id", "title", "description", "salary", "location",
    "employment_type", "skills_required", "source", "external_url"
];

export const updateJobOffer = async (id, userId, jobOfferData) => {
    const fieldsToUpdate = UPDATABLE_FIELDS.filter(
        (field) => jobOfferData[field] !== undefined
    );

    if (fieldsToUpdate.length === 0) {
        return null;
    }

    const setClause = fieldsToUpdate.map((field) => `${field} = ?`).join(", ");
    const values = fieldsToUpdate.map((field) => jobOfferData[field]);

    // Si se cambia company_id, la nueva empresa también tiene que ser del
    // recruiter. Se permite dejar la que ya tenía (ofertas antiguas cuya
    // empresa no tiene dueño registrado, de antes de companies.created_by_user).
    let companyCheck = "";
    const companyParams = [];
    if (jobOfferData.company_id !== undefined) {
        companyCheck = `AND (company_id = ? OR EXISTS (
            SELECT 1 FROM companies WHERE id = ? AND created_by_user = ?
        ))`;
        companyParams.push(jobOfferData.company_id, jobOfferData.company_id, userId);
    }

    const [result] = await db.execute(
        `UPDATE job_offers SET ${setClause} WHERE id = ? AND created_by_user = ? ${companyCheck}`,
        [...values, id, userId, ...companyParams]
    );

    return result;
};

export const deleteJobOffer = async (id, userId) => {
    const [result] = await db.execute(
        `DELETE FROM job_offers WHERE id = ? AND created_by_user = ?`,
        [id, userId]
    );
    return result;
};
