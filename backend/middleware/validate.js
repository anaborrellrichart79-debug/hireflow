import { validationResult } from "express-validator";

// Debe usarse siempre después de un array de validadores de express-validator
// (body(...), etc.) y antes del controller. Corta la petición con 400 si
// alguna validación falló, sin necesidad de comprobarlo a mano en cada ruta.
export const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: "Datos de entrada no válidos",
            errors: errors.array().map((e) => ({ field: e.path, message: e.msg }))
        });
    }

    next();
};
