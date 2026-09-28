import { body } from "express-validator";
import { msg } from "../i18n/index.js";

export const createUserValidators = [
    body("name").trim().notEmpty().withMessage(msg("v.required")).isLength({ max: 100 }).withMessage(msg("v.maxLength", { max: 100 })),
    body("email").trim().notEmpty().withMessage(msg("v.required")).isEmail().withMessage(msg("v.email")).isLength({ max: 150 }).withMessage(msg("v.maxLength", { max: 150 })),
    // Máximo 72: bcrypt ignora todo lo que pase de 72 bytes, así que una
    // contraseña más larga daría una falsa sensación de seguridad.
    body("password").notEmpty().withMessage(msg("v.required"))
        .isLength({ min: 8, max: 72 }).withMessage(msg("v.passwordLength"))
        .matches(/[A-Za-z]/).withMessage(msg("v.passwordLetter"))
        .matches(/\d/).withMessage(msg("v.passwordNumber")),
    body("role").optional().isIn(["candidate", "recruiter"]).withMessage(msg("v.oneOf", { values: "candidate, recruiter" })),
    body("termsAccepted").custom((value) => value === true).withMessage(msg("v.termsRequired"))
];

export const loginValidators = [
    body("email").trim().notEmpty().withMessage(msg("v.required")).isEmail().withMessage(msg("v.email")),
    body("password").notEmpty().withMessage(msg("v.required"))
];

export const updateProfileValidators = [
    body("name").optional().trim().notEmpty().withMessage(msg("v.notEmpty")).isLength({ max: 100 }).withMessage(msg("v.maxLength", { max: 100 })),
    body("sector").optional({ nullable: true }).isString().withMessage(msg("v.string")).isLength({ max: 100 }).withMessage(msg("v.maxLength", { max: 100 })),
    body("phone").optional({ nullable: true }).isString().withMessage(msg("v.string")).isLength({ max: 30 }).withMessage(msg("v.maxLength", { max: 30 })),
    body("location").optional({ nullable: true }).isString().withMessage(msg("v.string")).isLength({ max: 120 }).withMessage(msg("v.maxLength", { max: 120 })),
    body("profile_visible").optional().isBoolean().withMessage(msg("v.boolean"))
];

// Columnas TEXT (máx. real 65535 bytes); se limita bastante por debajo para
// dejar margen a caracteres multibyte de utf8mb4.
const CV_TEXT_MAX = 5000;

export const saveCvValidators = [
    body("education").optional({ nullable: true }).isString().withMessage(msg("v.string")).isLength({ max: CV_TEXT_MAX }).withMessage(msg("v.maxLength", { max: CV_TEXT_MAX })),
    body("work_experience").optional({ nullable: true }).isString().withMessage(msg("v.string")).isLength({ max: CV_TEXT_MAX }).withMessage(msg("v.maxLength", { max: CV_TEXT_MAX })),
    body("skills").optional({ nullable: true }).isString().withMessage(msg("v.string")).isLength({ max: 2000 }).withMessage(msg("v.maxLength", { max: 2000 })),
    body("about").optional({ nullable: true }).isString().withMessage(msg("v.string")).isLength({ max: CV_TEXT_MAX }).withMessage(msg("v.maxLength", { max: CV_TEXT_MAX })),
    body("resume_url").optional({ nullable: true }).isURL({ protocols: ["http", "https"], require_protocol: true }).withMessage(msg("v.httpUrl")).isLength({ max: 255 }).withMessage(msg("v.maxLength", { max: 255 }))
];
