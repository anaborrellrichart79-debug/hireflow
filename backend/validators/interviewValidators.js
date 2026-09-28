import { body } from "express-validator";
import { msg } from "../i18n/index.js";

// Acepta "YYYY-MM-DD HH:mm[:ss]" (formato nativo de MySQL DATETIME, usado en
// toda la documentación de la API) y también la variante con "T" de ISO8601.
const DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/;

export const createInterviewValidators = [
    body("application_id").notEmpty().withMessage(msg("v.required")).isInt({ min: 1 }).withMessage(msg("v.int")),
    body("interview_type_id").optional({ nullable: true }).isInt({ min: 1 }).withMessage(msg("v.int")),
    body("scheduled_date").notEmpty().withMessage(msg("v.required")).matches(DATETIME_REGEX).withMessage(msg("v.datetime")),
    body("location").optional({ nullable: true }).isString().withMessage(msg("v.string")).isLength({ max: 150 }).withMessage(msg("v.maxLength", { max: 150 })),
    body("notes").optional({ nullable: true }).isString().withMessage(msg("v.string"))
];

export const updateInterviewValidators = [
    body("interview_type_id").optional({ nullable: true }).isInt({ min: 1 }).withMessage(msg("v.int")),
    body("scheduled_date").optional().matches(DATETIME_REGEX).withMessage(msg("v.datetime")),
    body("location").optional({ nullable: true }).isString().withMessage(msg("v.string")).isLength({ max: 150 }).withMessage(msg("v.maxLength", { max: 150 })),
    body("notes").optional({ nullable: true }).isString().withMessage(msg("v.string"))
];
