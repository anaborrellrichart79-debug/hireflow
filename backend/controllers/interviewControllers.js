import {
    createInterview,
    getInterviewsByUser,
    getInterviewById,
    updateInterview,
    deleteInterview
} from "../models/interview.js";

export const createNewInterview = async (req, res) => {
    try {
        const interview = await createInterview(req.body, req.user.id);

        if (!interview) {
            return res.status(404).json({ message: "Postulación no encontrada" });
        }

        res.status(201).json(interview);
    } catch (error) {
        console.log("Error al crear entrevista", error);

        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({
                message: "El tipo de entrevista indicado (interview_type_id) no existe"
            });
        }

        res.status(500).json({ message: error.message });
    }
};

export const getUserInterviews = async (req, res) => {
    try {
        const interviews = await getInterviewsByUser(req.user.id);
        res.status(200).json(interviews);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener las entrevistas" });
    }
};

export const getInterview = async (req, res) => {
    try {
        const interview = await getInterviewById(req.params.id, req.user.id);

        if (!interview) {
            return res.status(404).json({ message: "Entrevista no encontrada" });
        }

        res.status(200).json(interview);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener la entrevista" });
    }
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
        console.log("Error al actualizar entrevista", error);

        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({
                message: "El tipo de entrevista indicado (interview_type_id) no existe"
            });
        }

        res.status(500).json({ message: "Error al actualizar la entrevista" });
    }
};

export const removeInterview = async (req, res) => {
    try {
        const result = await deleteInterview(req.params.id, req.user.id);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Entrevista no encontrada" });
        }

        res.status(200).json({ message: "Entrevista eliminada correctamente" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar la entrevista" });
    }
};
