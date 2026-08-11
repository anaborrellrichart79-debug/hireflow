import {
    createCompany,
    getAllCompanies,
    getCompanyById,
    updateCompany,
    deleteCompany
} from "../models/company.js";

const DUP_EMAIL_MESSAGE = "El email de la empresa ya está registrado";

export const createNewCompany = async (req, res) => {
    try {
        const company = await createCompany(req.body);
        res.status(201).json(company);
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ message: DUP_EMAIL_MESSAGE });
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
        return res.status(404).json({ message: "Empresa no encontrada" });
    }

    res.status(200).json(company);
};

export const updateExistingCompany = async (req, res) => {
    try {
        const result = await updateCompany(req.params.id, req.body);

        if (!result) {
            return res.status(400).json({ message: "Ningún campo válido para actualizar" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Empresa no encontrada" });
        }

        res.status(200).json({ message: "Empresa actualizada correctamente" });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ message: DUP_EMAIL_MESSAGE });
        }
        throw error;
    }
};

export const removeCompany = async (req, res) => {
    const result = await deleteCompany(req.params.id);

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Empresa no encontrada" });
    }

    res.status(200).json({ message: "Empresa eliminada correctamente" });
};
