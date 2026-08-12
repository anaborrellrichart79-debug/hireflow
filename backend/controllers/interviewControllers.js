import {
    createInterview,
    getInterviewsByUser,
    getInterviewById,
    updateInterview,
    deleteInterview,
    createInterviewForRecruiter,
    getInterviewsForRecruiter,
    deleteInterviewForRecruiter
} from "../models/interview.js";

const INVALID_INTERVIEW_TYPE_MESSAGE = "El tipo de entrevista indicado (interview_type_id) no existe";

// Quién puede agendar una entrevista y sobre qué postulación depende del rol:
// el candidato solo sobre las suyas (createInterview, ownership vía user_id),
// la empresa solo sobre postulaciones recibidas en sus propias ofertas
// (createInterviewForRecruiter, ownership vía job_offers.created_by_user).
export const createNewInterview = async (req, res) => {
    try {
        const interview = req.user.role === "recruiter"
            ? await createInterviewForRecruiter(req.body, req.user.id)
            : await createInterview(req.body, req.user.id);

        if (!interview) {
            return res.status(404).json({ message: "Postulación no encontrada" });
        }

        res.status(201).json(interview);
    } catch (error) {
        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({ message: INVALID_INTERVIEW_TYPE_MESSAGE });
        }
        throw error;
    }
};

export const getUserInterviews = async (req, res) => {
    const interviews = req.user.role === "recruiter"
        ? await getInterviewsForRecruiter(req.user.id)
        : await getInterviewsByUser(req.user.id);
    res.status(200).json(interviews);
};

export const getInterview = async (req, res) => {
    const interview = await getInterviewById(req.params.id, req.user.id);

    if (!interview) {
        return res.status(404).json({ message: "Entrevista no encontrada" });
    }

    res.status(200).json(interview);
};

export const updateExistingInterview = async (req, res) => {
    try {
        const result = await updateInterview(req.params.id, req.user.id, req.body);

        if (!result) {
            return res.status(400).json({ message: "Ningún campo válido para actualizar" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Entrevista no encontrada" });
        }

        res.status(200).json({ message: "Entrevista actualizada correctamente" });
    } catch (error) {
        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({ message: INVALID_INTERVIEW_TYPE_MESSAGE });
        }
        throw error;
    }
};

export const removeInterview = async (req, res) => {
    const result = req.user.role === "recruiter"
        ? await deleteInterviewForRecruiter(req.params.id, req.user.id)
        : await deleteInterview(req.params.id, req.user.id);

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Entrevista no encontrada" });
    }

    res.status(200).json({ message: "Entrevista eliminada correctamente" });
};
