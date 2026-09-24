import {
    createJobOffer,
    getAllJobOffers,
    getJobOfferById,
    updateJobOffer,
    deleteJobOffer
} from "../models/jobOffer.js";

const INVALID_COMPANY_MESSAGE = "La empresa indicada (company_id) no existe o no es tuya";

export const createNewJobOffer = async (req, res) => {
    try {
        const jobOffer = await createJobOffer({
            ...req.body,
            created_by_user: req.user.id
        });

        if (!jobOffer) {
            return res.status(400).json({ message: INVALID_COMPANY_MESSAGE });
        }

        res.status(201).json(jobOffer);
    } catch (error) {
        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({ message: INVALID_COMPANY_MESSAGE });
        }
        throw error;
    }
};

export const getJobOffers = async (req, res) => {
    const jobOffers = await getAllJobOffers(req.user.id);
    res.status(200).json(jobOffers);
};

export const getJobOffer = async (req, res) => {
    const jobOffer = await getJobOfferById(req.params.id);

    if (!jobOffer) {
        return res.status(404).json({ message: "Oferta no encontrada" });
    }

    res.status(200).json(jobOffer);
};

export const updateExistingJobOffer = async (req, res) => {
    try {
        const result = await updateJobOffer(req.params.id, req.user.id, req.body);

        if (!result) {
            return res.status(400).json({ message: "Ningún campo válido para actualizar" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Oferta no encontrada, o la empresa indicada no es tuya" });
        }

        res.status(200).json({ message: "Oferta actualizada correctamente" });
    } catch (error) {
        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({ message: INVALID_COMPANY_MESSAGE });
        }
        throw error;
    }
};

export const removeJobOffer = async (req, res) => {
    const result = await deleteJobOffer(req.params.id, req.user.id);

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Oferta no encontrada" });
    }

    res.status(200).json({ message: "Oferta eliminada correctamente" });
};
