import { body } from "express-validator";

const JOB_OFFER_SOURCES = ["internal", "linkedin", "api"];

export const createJobOfferValidators = [
    body("company_id").notEmpty().withMessage("company_id es obligatorio").isInt({ min: 1 }).withMessage("company_id debe ser un entero válido"),
    body("title").trim().notEmpty().withMessage("title es obligatorio").isLength({ max: 150 }).withMessage("title no puede superar 150 caracteres"),
    body("description").optional({ nullable: true }).isString(),
    body("salary").optional({ nullable: true }).isString().isLength({ max: 100 }),
    body("location").optional({ nullable: true }).isString().isLength({ max: 120 }),
    body("employment_type").optional({ nullable: true }).isString().isLength({ max: 50 }),
    body("skills_required").optional({ nullable: true }).isString(),
    body("source").optional().isIn(JOB_OFFER_SOURCES).withMessage(`source debe ser una de: ${JOB_OFFER_SOURCES.join(", ")}`),
    body("external_url").optional({ nullable: true }).isURL().withMessage("external_url no es una URL válida")
];

export const updateJobOfferValidators = [
    body("company_id").optional().isInt({ min: 1 }).withMessage("company_id debe ser un entero válido"),
    body("title").optional().trim().notEmpty().withMessage("title no puede estar vacío").isLength({ max: 150 }),
    body("description").optional({ nullable: true }).isString(),
    body("salary").optional({ nullable: true }).isString().isLength({ max: 100 }),
    body("location").optional({ nullable: true }).isString().isLength({ max: 120 }),
    body("employment_type").optional({ nullable: true }).isString().isLength({ max: 50 }),
    body("skills_required").optional({ nullable: true }).isString(),
    body("source").optional().isIn(JOB_OFFER_SOURCES).withMessage(`source debe ser una de: ${JOB_OFFER_SOURCES.join(", ")}`),
    body("external_url").optional({ nullable: true }).isURL().withMessage("external_url no es una URL válida")
];
