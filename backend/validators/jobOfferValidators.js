import { body } from "express-validator";
import { msg } from "../i18n/index.js";

const JOB_OFFER_SOURCES = ["internal", "linkedin", "api"];

export const createJobOfferValidators = [
    body("company_id").notEmpty().withMessage(msg("v.required")).isInt({ min: 1 }).withMessage(msg("v.int")),
    body("title").trim().notEmpty().withMessage(msg("v.required")).isLength({ max: 150 }).withMessage(msg("v.maxLength", { max: 150 })),
    body("description").optional({ nullable: true }).isString().withMessage(msg("v.string")),
    body("salary").optional({ nullable: true }).isString().withMessage(msg("v.string")).isLength({ max: 100 }).withMessage(msg("v.maxLength", { max: 100 })),
    body("location").optional({ nullable: true }).isString().withMessage(msg("v.string")).isLength({ max: 120 }).withMessage(msg("v.maxLength", { max: 120 })),
    body("employment_type").optional({ nullable: true }).isString().withMessage(msg("v.string")).isLength({ max: 50 }).withMessage(msg("v.maxLength", { max: 50 })),
    body("skills_required").optional({ nullable: true }).isString().withMessage(msg("v.string")),
    body("source").optional().isIn(JOB_OFFER_SOURCES).withMessage(msg("v.oneOf", { values: JOB_OFFER_SOURCES.join(", ") })),
    body("external_url").optional({ nullable: true }).isURL().withMessage(msg("v.url"))
];

export const updateJobOfferValidators = [
    body("company_id").optional().isInt({ min: 1 }).withMessage(msg("v.int")),
    body("title").optional().trim().notEmpty().withMessage(msg("v.notEmpty")).isLength({ max: 150 }).withMessage(msg("v.maxLength", { max: 150 })),
    body("description").optional({ nullable: true }).isString().withMessage(msg("v.string")),
    body("salary").optional({ nullable: true }).isString().withMessage(msg("v.string")).isLength({ max: 100 }).withMessage(msg("v.maxLength", { max: 100 })),
    body("location").optional({ nullable: true }).isString().withMessage(msg("v.string")).isLength({ max: 120 }).withMessage(msg("v.maxLength", { max: 120 })),
    body("employment_type").optional({ nullable: true }).isString().withMessage(msg("v.string")).isLength({ max: 50 }).withMessage(msg("v.maxLength", { max: 50 })),
    body("skills_required").optional({ nullable: true }).isString().withMessage(msg("v.string")),
    body("source").optional().isIn(JOB_OFFER_SOURCES).withMessage(msg("v.oneOf", { values: JOB_OFFER_SOURCES.join(", ") })),
    body("external_url").optional({ nullable: true }).isURL().withMessage(msg("v.url"))
];
