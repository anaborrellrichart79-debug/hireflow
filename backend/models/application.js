import { db } from "../config/database.js";

export const createApplication = async (applicationData) => {
    const { 
        user_id,
        job_offer_id,
        status = "wishlist",
        notes,
    } = applicationData;

    const appliedDate = status === "applied" ? new Date() : null;

    const [ result ] = await db.execute(
        `
        INSERT INTO applications (
        user_id,
        job_offer_id,
        status,
        notes,
        applied_date
        )
        VALUES (?,?,?,?,?)
        `,
        [user_id, job_offer_id, status, notes, appliedDate]
    );
    return {
        id: result.insertId,
        user_id,
        job_offer_id,
        status,
        notes,
        applied_date: appliedDate
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

export const updateApplication = async (id, userId, status, notes) => {
    const [result] = await db.execute(
        `
        UPDATE applications
        SET status = ?,
            notes = ?,
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