import { body } from "express-validator";
import { AI_LANGS } from "../models/ai.js";

// Idioma de la respuesta (textos del asistente y contenido del catálogo).
// Opcional: sin él, español. Ver docs/decisions.md, entrada 028.
const langValidator = body("lang").optional().isIn(AI_LANGS).withMessage(`lang debe ser una de: ${AI_LANGS.join(", ")}`);

const QUESTION_CATEGORIES = ["personal", "technical", "behavioral", "stress", "culture_fit"];
const QUESTION_DIFFICULTIES = ["basic", "intermediate", "advanced"];

export const cvReviewValidators = [
    body("industry").trim().notEmpty().withMessage("industry es obligatorio").isLength({ max: 120 }),
    body("company_type").optional({ nullable: true }).isString().isLength({ max: 120 }),
    langValidator
];

export const interviewQuestionsValidators = [
    body("category").optional().isIn(QUESTION_CATEGORIES).withMessage(`category debe ser una de: ${QUESTION_CATEGORIES.join(", ")}`),
    body("difficulty").optional().isIn(QUESTION_DIFFICULTIES).withMessage(`difficulty debe ser una de: ${QUESTION_DIFFICULTIES.join(", ")}`),
    body("limit").optional().isInt({ min: 1, max: 50 }).withMessage("limit debe ser un entero entre 1 y 50").toInt(),
    langValidator
];

export const interviewFeedbackValidators = [
    body("skills").isArray({ min: 1 }).withMessage("skills debe ser un array con al menos 1 elemento"),
    body("skills.*").isString().trim().notEmpty().withMessage("cada elemento de skills debe ser texto no vacío"),
    langValidator
];

export const jobMatchValidators = [
    body("job_offer_id").notEmpty().withMessage("job_offer_id es obligatorio").isInt({ min: 1 }).withMessage("job_offer_id debe ser un entero válido").toInt(),
    body("skills").trim().notEmpty().withMessage("skills es obligatorio").isLength({ max: 2000 }),
    langValidator
];

export const askValidators = [
    body("message").trim().notEmpty().withMessage("message es obligatorio").isLength({ max: 1000 }).withMessage("message no puede superar 1000 caracteres"),
    langValidator
];
