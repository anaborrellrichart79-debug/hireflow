import {
    createCompany,
    getAllCompanies,
    getCompanyById,
    updateCompany,
    deleteCompany
} from "../models/company.js";


export const createNewCompany = async (req, res) => {
    try {
        const company = await createCompany({
            ...req.body,
            created_by_user: req.user.id
        });
        res.status(201).json(company);
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ message: req.t("companies.emailTaken") });
        }
        throw error;
    }
};

export const getCompanies = async (req, res) => {
    const companies = await getAllCompanies();
    res.status(200).json(companies);
};

export const getCompany = async (req, res) => {
    const company = await getCompanyById(req.params.id);

    if (!company) {
        return res.status(404).json({ message: req.t("companies.notFound") });
    }

    res.status(200).json(company);
};

export const updateExistingCompany = async (req, res) => {
    try {
        const result = await updateCompany(req.params.id, req.user.id, req.body);

        if (!result) {
            return res.status(400).json({ message: req.t("common.noValidFields") });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: req.t("companies.notFound") });
        }

        res.status(200).json({ message: req.t("companies.updated") });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ message: req.t("companies.emailTaken") });
        }
        throw error;
    }
};

export const removeCompany = async (req, res) => {
    const result = await deleteCompany(req.params.id, req.user.id);

    if (result === "not_found") {
        return res.status(404).json({ message: req.t("companies.notFound") });
    }

    if (result === "has_offers") {
        return res.status(409).json({ message: req.t("companies.hasOffers") });
    }

    res.status(200).json({ message: req.t("companies.deleted") });
};
