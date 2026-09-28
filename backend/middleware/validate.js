import { validationResult } from "express-validator";
import { translate, fieldLabel } from "../i18n/index.js";

// Mensaje por defecto de express-validator cuando una regla no tiene
// withMessage: se sustituye por uno traducido con el nombre del campo.
const LIBRARY_DEFAULT_MESSAGE = "Invalid value";

// Debe usarse siempre después de un array de validadores de express-validator
// (body(...), etc.) y antes del controller. Corta la petición con 400 si
// alguna validación falló, sin necesidad de comprobarlo a mano en cada ruta.
// Los mensajes salen en el idioma de la petición (ver i18n/index.js).
export const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: req.t("validation.failed"),
            errors: errors.array().map((e) => ({
                field: e.path,
                message: e.msg === LIBRARY_DEFAULT_MESSAGE
                    ? translate(req.lang, "v.invalid", { field: fieldLabel(req.lang, e.path) })
                    : e.msg
            }))
        });
    }

    next();
};
