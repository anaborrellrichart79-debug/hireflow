import { db } from "../config/database.js";

export const createCompany = async (companyData) => {
    const {
        name,
        email,
        description = null,
        industry = null,
        location = null,
        phone = null
    } = companyData;

    const [result] = await db.execute(
        `
        INSERT INTO companies (name, email, description, industry, location, phone)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [name, email, description, industry, location, phone]
    );

    return {
        id: result.insertId,
        name,
        email,
        description,
        industry,
        location,
        phone
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
const UPDATABLE_FIELDS = ["name", "email", "description", "industry", "location", "phone"];

export const updateCompany = async (id, companyData) => {
    const fieldsToUpdate = UPDATABLE_FIELDS.filter(
        (field) => companyData[field] !== undefined
    );

    if (fieldsToUpdate.length === 0) {
        return null;
    }

    const setClause = fieldsToUpdate.map((field) => `${field} = ?`).join(", ");
    const values = fieldsToUpdate.map((field) => companyData[field]);

    const [result] = await db.execute(
        `UPDATE companies SET ${setClause} WHERE id = ?`,
        [...values, id]
    );

    return result;
};

export const deleteCompany = async (id) => {
    const [result] = await db.execute(
        `DELETE FROM companies WHERE id = ?`,
        [id]
    );
    return result;
};
