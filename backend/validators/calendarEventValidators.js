import { body } from "express-validator";

const EVENT_TYPES = ["interview", "job_search", "reminder", "meeting"];

export const createCalendarEventValidators = [
    body("title").trim().notEmpty().withMessage("title es obligatorio").isLength({ max: 150 }).withMessage("title no puede superar 150 caracteres"),
    body("description").optional({ nullable: true }).isString(),
    body("event_type").optional().isIn(EVENT_TYPES).withMessage(`event_type debe ser una de: ${EVENT_TYPES.join(", ")}`),
    body("related_application").optional({ nullable: true }).isInt({ min: 1 }).withMessage("related_application debe ser un entero válido")
];

export const updateCalendarEventValidators = [
    body("title").optional().trim().notEmpty().withMessage("title no puede estar vacío").isLength({ max: 150 }),
    body("description").optional({ nullable: true }).isString(),
    body("event_type").optional().isIn(EVENT_TYPES).withMessage(`event_type debe ser una de: ${EVENT_TYPES.join(", ")}`),
    body("related_application").optional({ nullable: true }).isInt({ min: 1 }).withMessage("related_application debe ser un entero válido")
];
