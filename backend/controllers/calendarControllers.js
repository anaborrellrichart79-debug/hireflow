import {
    createCalendarEvent,
    getCalendarEventsByUser,
    getCalendarEventById,
    updateCalendarEvent,
    deleteCalendarEvent
} from "../models/calendarEvent.js";
import { getApplicationById } from "../models/application.js";


// related_application es una FK opcional hacia applications, que ya tiene su
// propio dueño (user_id). Se valida aquí, reutilizando getApplicationById
// (que ya filtra por id + user_id), en vez de dejar que la FK de la BD la
// valide solo por existencia: así no se puede enlazar un evento a una
// application ajena, ni siquiera pasando un id válido de otro usuario.
const isRelatedApplicationOwnedByUser = async (relatedApplicationId, userId) => {
    if (relatedApplicationId === undefined || relatedApplicationId === null) {
        return true;
    }
    const application = await getApplicationById(relatedApplicationId, userId);
    return Boolean(application);
};

export const createNewCalendarEvent = async (req, res) => {
    if (!(await isRelatedApplicationOwnedByUser(req.body.related_application, req.user.id))) {
        return res.status(400).json({ message: req.t("calendar.invalidRelated") });
    }

    const event = await createCalendarEvent(req.body, req.user.id);
    res.status(201).json(event);
};

export const getCalendarEvents = async (req, res) => {
    const events = await getCalendarEventsByUser(req.user.id);
    res.status(200).json(events);
};

export const getCalendarEvent = async (req, res) => {
    const event = await getCalendarEventById(req.params.id, req.user.id);

    if (!event) {
        return res.status(404).json({ message: req.t("calendar.notFound") });
    }

    res.status(200).json(event);
};

export const updateExistingCalendarEvent = async (req, res) => {
    if (!(await isRelatedApplicationOwnedByUser(req.body.related_application, req.user.id))) {
        return res.status(400).json({ message: req.t("calendar.invalidRelated") });
    }

    const result = await updateCalendarEvent(req.params.id, req.user.id, req.body);

    if (!result) {
        return res.status(400).json({ message: req.t("common.noValidFields") });
    }

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: req.t("calendar.notFound") });
    }

    res.status(200).json({ message: req.t("calendar.updated") });
};

export const removeCalendarEvent = async (req, res) => {
    const result = await deleteCalendarEvent(req.params.id, req.user.id);

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: req.t("calendar.notFound") });
    }

    res.status(200).json({ message: req.t("calendar.deleted") });
};
