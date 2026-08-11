import {
    createInterview,
    getInterviewsByUser,
    getInterviewById,
    updateInterview,
    deleteInterview
} from "../models/interview.js";

const INVALID_INTERVIEW_TYPE_MESSAGE = "El tipo de entrevista indicado (interview_type_id) no existe";

export const createNewInterview = async (req, res) => {
    try {
        const interview = await createInterview(req.body, req.user.id);

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
    const interviews = await getInterviewsByUser(req.user.id);
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
    const result = await deleteInterview(req.params.id, req.user.id);

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Entrevista no encontrada" });
    }

    res.status(200).json({ message: "Entrevista eliminada correctamente" });
};
