import { db } from "../config/database.js";

export const createCompany = async (companyData) => {
    const {
        name,
        email,
        description = null,
        industry = null,
        location = null,
        phone = null,
        created_by_user
    } = companyData;

    const [result] = await db.execute(
        `
        INSERT INTO companies (name, email, description, industry, location, phone, created_by_user)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [name, email, description, industry, location, phone, created_by_user]
    );

    return {
        id: result.insertId,
        name,
        email,
        description,
        industry,
        location,
        phone,
        created_by_user
    };
};

export const getAllCompanies = async () => {
    const [rows] = await db.execute(
        `SELECT * FROM companies ORDER BY created_at DESC`
    );
    return rows;
};

export const getCompanyById = async (id) => {
    const [rows] = await db.execute(
        `SELECT * FROM companies WHERE id = ?`,
        [id]
    );
    return rows[0];
};

// Solo acepta campos de esta lista blanca — nunca se construye la query
// con nombres de columna que vengan del cliente (mismo patrón que updateUser).
// created_by_user queda fuera a propósito: la propiedad de una empresa no se
// reasigna desde un update (mismo criterio que en job_offers).
const UPDATABLE_FIELDS = ["name", "email", "description", "industry", "location", "phone"];

export const updateCompany = async (id, userId, companyData) => {
    const fieldsToUpdate = UPDATABLE_FIELDS.filter(
        (field) => companyData[field] !== undefined
    );

    if (fieldsToUpdate.length === 0) {
        return null;
    }

    const setClause = fieldsToUpdate.map((field) => `${field} = ?`).join(", ");
    const values = fieldsToUpdate.map((field) => companyData[field]);

    const [result] = await db.execute(
        `UPDATE companies SET ${setClause} WHERE id = ? AND created_by_user = ?`,
        [...values, id, userId]
    );

    return result;
};

// Borrar una empresa arrastraría en cascada sus ofertas y, con ellas, las
// postulaciones de los candidatos (fk_job_company y fk_application_job son
// ON DELETE CASCADE). Por eso solo se borra si ya no le quedan ofertas: el
// recruiter tiene que borrar antes sus ofertas, una a una y a propósito.
// Devuelve "deleted", "has_offers" o "not_found" (no existe o no es suya).
export const deleteCompany = async (id, userId) => {
    const [result] = await db.execute(
        `
        DELETE FROM companies
        WHERE id = ? AND created_by_user = ?
          AND NOT EXISTS (SELECT 1 FROM job_offers WHERE company_id = ?)
        `,
        [id, userId, id]
    );

    if (result.affectedRows > 0) {
        return "deleted";
    }

    const [rows] = await db.execute(
        `SELECT 1 FROM companies WHERE id = ? AND created_by_user = ?`,
        [id, userId]
    );
    return rows.length > 0 ? "has_offers" : "not_found";
};
