import { db } from "../config/database.js";

export const createApplication = async (applicationData) => {
    const { 
        user_id,
        job_offer_id,
        status = "wishlist",
        notes,
    } = applicationData;

    console.log("Datos recibidos en createApplication:");
    console.log(applicationData);

    console.log({
    user_id,
    job_offer_id,
    status,
    notes
    });
    
    const [ result ] = await db.execute(
        `
        INSERT INTO applications (
        user_id,
        job_offer_id,
        status,
        notes,
        applied_date
        )
        VALUES (?,?,?,?,NOW())
        `,
        [user_id, job_offer_id, status, notes]
    );
    return {
        id: result.insertId,
        user_id,
        job_offer_id,
        status,
        notes,
        applied_date: new Date()
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

export const getApplicationById = async (id) => {
    const [rows] = await db.execute(
        `
        SELECT * FROM applications
        WHERE id = ?
        `, 
        [id]
    );

    console.log("ID recibido:", id);
    console.log("Rows:", rows);
    return rows[0];
};

export const updateApplication = async (id, status, notes) => {
    const [result] = await db.execute(
        `
        UPDATE applications
        SET status = ?, notes = ?
        WHERE id = ?
        `,
        [status, notes, id]
    );
    return result;
};

export const deleteApplication = async (id) => {
    const [result] = await db.execute(
        `
        DELETE FROM applications
        WHERE id = ?
        `,
        [id]
    );
    
    return result;
};