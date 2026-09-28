import { body } from "express-validator";
import { AI_LANGS } from "../models/ai.js";
import { msg } from "../i18n/index.js";

// Idioma de la respuesta (textos del asistente y contenido del catálogo).
// Opcional: sin él, el de la petición (Accept-Language). Ver docs/decisions.md,
// entradas 028 y 038.
const langValidator = body("lang").optional().isIn(AI_LANGS).withMessage(msg("v.oneOf", { values: AI_LANGS.join(", ") }));

const QUESTION_CATEGORIES = ["personal", "technical", "behavioral", "stress", "culture_fit"];
const QUESTION_DIFFICULTIES = ["basic", "intermediate", "advanced"];

export const cvReviewValidators = [
    body("industry").trim().notEmpty().withMessage(msg("v.required")).isLength({ max: 120 }).withMessage(msg("v.maxLength", { max: 120 })),
    body("company_type").optional({ nullable: true }).isString().withMessage(msg("v.string")).isLength({ max: 120 }).withMessage(msg("v.maxLength", { max: 120 })),
    langValidator
];

export const interviewQuestionsValidators = [
    body("category").optional().isIn(QUESTION_CATEGORIES).withMessage(msg("v.oneOf", { values: QUESTION_CATEGORIES.join(", ") })),
    body("difficulty").optional().isIn(QUESTION_DIFFICULTIES).withMessage(msg("v.oneOf", { values: QUESTION_DIFFICULTIES.join(", ") })),
    body("limit").optional().isInt({ min: 1, max: 50 }).withMessage(msg("v.intRange", { min: 1, max: 50 })).toInt(),
    langValidator
];

export const interviewFeedbackValidators = [
    body("skills").isArray({ min: 1 }).withMessage(msg("v.arrayMin", { min: 1 })),
    body("skills.*").isString().withMessage(msg("v.arrayItemText")).trim().notEmpty().withMessage(msg("v.arrayItemText")),
    langValidator
];

export const jobMatchValidators = [
    body("job_offer_id").notEmpty().withMessage(msg("v.required")).isInt({ min: 1 }).withMessage(msg("v.int")).toInt(),
    // Opcional: si no se envía, el controller usa las skills del CV guardado (GET /users/me/cv)
    body("skills").optional({ nullable: true }).isString().withMessage(msg("v.string")).trim().notEmpty().withMessage(msg("v.notEmpty")).isLength({ max: 2000 }).withMessage(msg("v.maxLength", { max: 2000 })),
    langValidator
];

export const askValidators = [
    body("message").trim().notEmpty().withMessage(msg("v.required")).isLength({ max: 1000 }).withMessage(msg("v.maxLength", { max: 1000 })),
    langValidator
];
