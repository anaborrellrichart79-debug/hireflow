import { body } from "express-validator";

// Acepta "YYYY-MM-DD HH:mm[:ss]" (formato nativo de MySQL DATETIME, usado en
// toda la documentación de la API) y también la variante con "T" de ISO8601.
const DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/;

export const createInterviewValidators = [
    body("application_id").notEmpty().withMessage("application_id es obligatorio").isInt({ min: 1 }).withMessage("application_id debe ser un entero válido"),
    body("interview_type_id").optional({ nullable: true }).isInt({ min: 1 }).withMessage("interview_type_id debe ser un entero válido"),
    body("scheduled_date").notEmpty().withMessage("scheduled_date es obligatorio").matches(DATETIME_REGEX).withMessage("scheduled_date debe tener el formato YYYY-MM-DD HH:mm:ss"),
    body("location").optional({ nullable: true }).isString().isLength({ max: 150 }),
    body("notes").optional({ nullable: true }).isString()
];

export const updateInterviewValidators = [
    body("interview_type_id").optional({ nullable: true }).isInt({ min: 1 }).withMessage("interview_type_id debe ser un entero válido"),
    body("scheduled_date").optional().matches(DATETIME_REGEX).withMessage("scheduled_date debe tener el formato YYYY-MM-DD HH:mm:ss"),
    body("location").optional({ nullable: true }).isString().isLength({ max: 150 }),
    body("notes").optional({ nullable: true }).isString()
];
