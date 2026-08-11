import { createApplication,
    getApplicationByUser,
    getApplicationById,
    updateApplication,
    deleteApplication } from "../models/application.js";
import { APPLICATION_STATUS } from "../constants/applicationStatus.js";

export const createNewApplication = async (req, res) => {
    const application = await createApplication({
        user_id: req.user.id, // Obtener el ID del usuario autenticado
        job_offer_id: req.body.job_offer_id,
        status: APPLICATION_STATUS.WISHLIST,
        notes: req.body.notes
    });

    res.status(201).json(application);
};

export const getUserApplications = async (req, res) => {
    const applications = await getApplicationByUser(req.user.id);
    res.status(200).json(applications);
};

export const getApplication = async (req, res) => {
    const application = await getApplicationById(req.params.id, req.user.id);

    if (!application) {
        return res.status(404).json({ message: "Postulación no encontrada" });
    }

    res.status(200).json(application);
};

export const updateExistingApplication = async (req, res) => {
    const { status, notes } = req.body;

    const result = await updateApplication(req.params.id, req.user.id, status, notes);

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Postulación no encontrada" });
    }

    res.status(200).json({ message: "Postulación actualizada correctamente" });
};

export const removeApplication = async (req, res) => {
    const result = await deleteApplication(req.params.id, req.user.id);

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Postulación no encontrada" });
    }

    res.status(200).json({ message: "Postulación eliminada correctamente" });
};
