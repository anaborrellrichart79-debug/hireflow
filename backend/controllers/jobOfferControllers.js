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

        if (!jobOffer) {
            return res.status(400).json({ message: req.t("jobs.invalidCompany") });
        }

        res.status(201).json(jobOffer);
    } catch (error) {
        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({ message: req.t("jobs.invalidCompany") });
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
        return res.status(404).json({ message: req.t("jobs.notFound") });
    }

    res.status(200).json(jobOffer);
};

export const updateExistingJobOffer = async (req, res) => {
    try {
        const result = await updateJobOffer(req.params.id, req.user.id, req.body);

        if (!result) {
            return res.status(400).json({ message: req.t("common.noValidFields") });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: req.t("jobs.notFoundOrCompany") });
        }

        res.status(200).json({ message: req.t("jobs.updated") });
    } catch (error) {
        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({ message: req.t("jobs.invalidCompany") });
        }
        throw error;
    }
};

export const removeJobOffer = async (req, res) => {
    const result = await deleteJobOffer(req.params.id, req.user.id);

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: req.t("jobs.notFound") });
    }

    res.status(200).json({ message: req.t("jobs.deleted") });
};
