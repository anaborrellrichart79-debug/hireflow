import { body } from "express-validator";
import { msg } from "../i18n/index.js";

export const createCompanyValidators = [
    body("name").trim().notEmpty().withMessage(msg("v.required")).isLength({ max: 150 }).withMessage(msg("v.maxLength", { max: 150 })),
    body("email").trim().notEmpty().withMessage(msg("v.required")).isEmail().withMessage(msg("v.email")).isLength({ max: 150 }).withMessage(msg("v.maxLength", { max: 150 })),
    body("description").optional({ nullable: true }).isString().withMessage(msg("v.string")),
    body("industry").optional({ nullable: true }).isString().withMessage(msg("v.string")).isLength({ max: 120 }).withMessage(msg("v.maxLength", { max: 120 })),
    body("location").optional({ nullable: true }).isString().withMessage(msg("v.string")).isLength({ max: 120 }).withMessage(msg("v.maxLength", { max: 120 })),
    body("phone").optional({ nullable: true }).isString().withMessage(msg("v.string")).isLength({ max: 30 }).withMessage(msg("v.maxLength", { max: 30 }))
];

export const updateCompanyValidators = [
    body("name").optional().trim().notEmpty().withMessage(msg("v.notEmpty")).isLength({ max: 150 }).withMessage(msg("v.maxLength", { max: 150 })),
    body("email").optional().trim().notEmpty().withMessage(msg("v.notEmpty")).isEmail().withMessage(msg("v.email")).isLength({ max: 150 }).withMessage(msg("v.maxLength", { max: 150 })),
    body("description").optional({ nullable: true }).isString().withMessage(msg("v.string")),
    body("industry").optional({ nullable: true }).isString().withMessage(msg("v.string")).isLength({ max: 120 }).withMessage(msg("v.maxLength", { max: 120 })),
    body("location").optional({ nullable: true }).isString().withMessage(msg("v.string")).isLength({ max: 120 }).withMessage(msg("v.maxLength", { max: 120 })),
    body("phone").optional({ nullable: true }).isString().withMessage(msg("v.string")).isLength({ max: 30 }).withMessage(msg("v.maxLength", { max: 30 }))
];
