import { createApplication,
    getApplicationByUser,
    getApplicationById,
    updateApplication,
    deleteApplication,
    updateApplicationStatusByRecruiter,
    getApplicationsForRecruiter,
    markApplicationStatusUpdatesSeen } from "../models/application.js";
import { APPLICATION_STATUS } from "../constants/applicationStatus.js";

export const createNewApplication = async (req, res) => {
    const application = await createApplication({
        user_id: req.user.id, // Obtener el ID del usuario autenticado
        job_offer_id: req.body.job_offer_id,
        status: APPLICATION_STATUS.WISHLIST,
        notes: req.body.notes,
        consent_share_contact: req.body.consent === true,
        signature_name: req.body.signature
    });

    res.status(201).json(application);
};

export const getUserApplications = async (req, res) => {
    const applications = await getApplicationByUser(req.user.id);
    res.status(200).json(applications);
};

// GET /applications/recruiter?jobOfferId=123 -- postulaciones recibidas en
// las ofertas publicadas por el recruiter autenticado (nunca las de otro).
export const getRecruiterApplications = async (req, res) => {
    const jobOfferId = req.query.jobOfferId ? Number(req.query.jobOfferId) : null;
    const applications = await getApplicationsForRecruiter(req.user.id, jobOfferId);
    res.status(200).json(applications);
};

// PUT /applications/:id/status -- solo el recruiter dueño de la oferta puede
// mover el estado del candidato (entrevista, oferta, rechazado...). No toca
// las notas privadas del candidato.
export const updateApplicationStatusAsRecruiter = async (req, res) => {
    const result = await updateApplicationStatusByRecruiter(req.params.id, req.user.id, req.body.status);

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Postulación no encontrada" });
    }

    res.status(200).json({ message: "Estado actualizado. El candidato lo verá reflejado en sus postulaciones." });
};

// PUT /applications/mark-seen -- el candidato confirma que ha visto los
// cambios de estado pendientes (se llama al abrir la pantalla de postulaciones).
export const markApplicationsSeen = async (req, res) => {
    await markApplicationStatusUpdatesSeen(req.user.id);
    res.status(200).json({ message: "Actualizaciones marcadas como vistas" });
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
