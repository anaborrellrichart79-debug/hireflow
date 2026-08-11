import {
    createJobOffer,
    getAllJobOffers,
    getJobOfferById,
    updateJobOffer,
    deleteJobOffer
} from "../models/jobOffer.js";

export const createNewJobOffer = async (req, res) => {
    try {
        const jobOffer = await createJobOffer({
            ...req.body,
            created_by_user: req.user.id
        });

        res.status(201).json(jobOffer);
    } catch (error) {
        console.log("Error al crear oferta", error);

        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({
                message: "La empresa indicada (company_id) no existe"
            });
        }

        res.status(500).json({ message: error.message });
    }
};

export const getJobOffers = async (req, res) => {
    try {
        const jobOffers = await getAllJobOffers();
        res.status(200).json(jobOffers);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener las ofertas" });
    }
};

export const getJobOffer = async (req, res) => {
    try {
        const jobOffer = await getJobOfferById(req.params.id);

        if (!jobOffer) {
            return res.status(404).json({ message: "Oferta no encontrada" });
        }

        res.status(200).json(jobOffer);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener la oferta" });
    }
};

export const updateExistingJobOffer = async (req, res) => {
    try {
        const result = await updateJobOffer(req.params.id, req.body);

        if (!result) {
            return res.status(400).json({ message: "Ningún campo válido para actualizar" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Oferta no encontrada" });
        }

        res.status(200).json({ message: "Oferta actualizada correctamente" });
    } catch (error) {
        console.log("Error al actualizar oferta", error);

        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({
                message: "La empresa indicada (company_id) no existe"
            });
        }

        res.status(500).json({ message: "Error al actualizar la oferta" });
    }
};

export const removeJobOffer = async (req, res) => {
    try {
        const result = await deleteJobOffer(req.params.id);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Oferta no encontrada" });
        }

        res.status(200).json({ message: "Oferta eliminada correctamente" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar la oferta" });
    }
};
