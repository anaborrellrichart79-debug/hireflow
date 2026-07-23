import { createApplication, 
    getApplicationByUser, 
    getApplicationById, 
    updateApplication, 
    deleteApplication } from "../models/application.js";

export const APPLICATION_STATUS = {
    WISHLIST: "wishlist",
    APPLIED: "applied",
    INTERVIEW: "interview",
    OFFER: "offer",
    REJECTED: "rejected"
};

export const createNewApplication = async (req, res) => {
    try {

        console.log("req.user:", req.user);
        console.log("req.body:", req.body);

        const application = await createApplication({
    
            user_id: req.user.id, // Obtener el ID del usuario autenticado
            job_offer_id: req.body.job_offer_id,
            status: APPLICATION_STATUS.WISHLIST,
            notes: req.body.notes
        });

        res.status(201).json(application);

    } catch (error) {

        console.log(error);

        res.status(500).json({ message:error.message, error });

    }
};

export const getUserApplications = async (req, res) => {
    try {
        const userId = req.user.id; // Obtener el ID del usuario autenticado
        const applications = await getApplicationByUser(userId);
        
        res.status(200).json(applications);
    } catch (error) {
        console.log(error);
        
        res.status(500).json({ message:"Error al obtener las postulaciones" });
    }
};  


export const getApplication = async (req, res) => {
    try {

        const application = await getApplicationById(req.params.id);
    
        if (!application) {
            return res.status(404).json({
                message: "Postulación no encontrada"
            });
        }
        res.status(200).json(application);
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Error al obtener postulación"
        });
    }

};


export const updateExistingApplication = async (req, res) => {
    try {

        const { status, notes } = req.body;

        const result = await updateApplication(
            req.params.id,
            status,
            notes
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Postulación no encontrada"
            });
        }

        res.status(200).json({
            message: "Postulación actualizada correctamente"
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Error al actualizar la postulación"
        });
    }
};

export const removeApplication = async (req, res) => {
    try {
        const result = await deleteApplication(req.params.id);

        if (result.affectedRows === 0) {
            return res.status(404).json ({
                message:"Postulación no encontrada"
            });
        }

        res.status(200).json ({
            message: "Postulación eliminada correctamente"
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Error al eliminar la postulación"
        });
    }
};