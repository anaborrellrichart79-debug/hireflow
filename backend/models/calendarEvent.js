import { db } from "../config/database.js";

export const createCalendarEvent = async (eventData, userId) => {
    const {
        title,
        description = null,
        event_type = "reminder",
        related_application = null
    } = eventData;

    const [result] = await db.execute(
        `
        INSERT INTO calendar_events (user_id, title, description, event_type, related_application)
        VALUES (?, ?, ?, ?, ?)
        `,
        [userId, title, description, event_type, related_application]
    );

    return {
        id: result.insertId,
        user_id: userId,
        title,
        description,
        event_type,
        related_application
    };
};

export const getCalendarEventsByUser = async (userId) => {
    const [rows] = await db.execute(
        `
        SELECT * FROM calendar_events WHERE user_id = ?
        ORDER BY created_at DESC
        `,
        [userId]
    );
    return rows;
};

export const getCalendarEventById = async (id, userId) => {
    const [rows] = await db.execute(
        `
        SELECT * FROM calendar_events
        WHERE id = ? AND user_id = ?
        `,
        [id, userId]
    );
    return rows[0];
};

const UPDATABLE_FIELDS = ["title", "description", "event_type", "related_application"];

export const updateCalendarEvent = async (id, userId, eventData) => {
    const fieldsToUpdate = UPDATABLE_FIELDS.filter(
        (field) => eventData[field] !== undefined
    );

    if (fieldsToUpdate.length === 0) {
        return null;
    }

    const setClause = fieldsToUpdate.map((field) => `${field} = ?`).join(", ");
    const values = fieldsToUpdate.map((field) => eventData[field]);

    const [result] = await db.execute(
        `UPDATE calendar_events SET ${setClause} WHERE id = ? AND user_id = ?`,
        [...values, id, userId]
    );

    return result;
};

export const deleteCalendarEvent = async (id, userId) => {
    const [result] = await db.execute(
        `
        DELETE FROM calendar_events
        WHERE id = ? AND user_id = ?
        `,
        [id, userId]
    );

    return result;
};
