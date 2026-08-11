import {
    createCompany,
    getAllCompanies,
    getCompanyById,
    updateCompany,
    deleteCompany
} from "../models/company.js";

export const createNewCompany = async (req, res) => {
    try {
        const company = await createCompany(req.body);
        res.status(201).json(company);
    } catch (error) {
        console.log("Error al crear empresa", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(400).json({
                message: "El email de la empresa ya está registrado"
            });
        }

        res.status(500).json({ message: error.message });
    }
};

export const getCompanies = async (req, res) => {
    try {
        const companies = await getAllCompanies();
        res.status(200).json(companies);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener las empresas" });
    }
};

export const getCompany = async (req, res) => {
    try {
        const company = await getCompanyById(req.params.id);

        if (!company) {
            return res.status(404).json({ message: "Empresa no encontrada" });
        }

        res.status(200).json(company);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener la empresa" });
    }
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
        console.log("Error al actualizar empresa", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(400).json({
                message: "El email de la empresa ya está registrado"
            });
        }

        res.status(500).json({ message: "Error al actualizar la empresa" });
    }
};

export const removeCompany = async (req, res) => {
    try {
        const result = await deleteCompany(req.params.id);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Empresa no encontrada" });
        }

        res.status(200).json({ message: "Empresa eliminada correctamente" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar la empresa" });
    }
};
