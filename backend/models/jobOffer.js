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

    const [result] = await db.execute(
        `
        INSERT INTO job_offers (
            company_id, title, description, salary, location,
            employment_type, skills_required, source, external_url, created_by_user
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [company_id, title, description, salary, location, employment_type, skills_required, source, external_url, created_by_user]
    );

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

export const getAllJobOffers = async () => {
    const [rows] = await db.execute(
        `SELECT * FROM job_offers ORDER BY created_at DESC`
    );
    return rows;
};

export const getJobOfferById = async (id) => {
    const [rows] = await db.execute(
        `SELECT * FROM job_offers WHERE id = ?`,
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

export const updateJobOffer = async (id, jobOfferData) => {
    const fieldsToUpdate = UPDATABLE_FIELDS.filter(
        (field) => jobOfferData[field] !== undefined
    );

    if (fieldsToUpdate.length === 0) {
        return null;
    }

    const setClause = fieldsToUpdate.map((field) => `${field} = ?`).join(", ");
    const values = fieldsToUpdate.map((field) => jobOfferData[field]);

    const [result] = await db.execute(
        `UPDATE job_offers SET ${setClause} WHERE id = ?`,
        [...values, id]
    );

    return result;
};

export const deleteJobOffer = async (id) => {
    const [result] = await db.execute(
        `DELETE FROM job_offers WHERE id = ?`,
        [id]
    );
    return result;
};
