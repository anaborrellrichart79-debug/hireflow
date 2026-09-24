import { body } from "express-validator";

export const createUserValidators = [
    body("name").trim().notEmpty().withMessage("name es obligatorio").isLength({ max: 100 }).withMessage("name no puede superar 100 caracteres"),
    body("email").trim().notEmpty().withMessage("email es obligatorio").isEmail().withMessage("email no es válido").isLength({ max: 150 }),
    // Máximo 72: bcrypt ignora todo lo que pase de 72 bytes, así que una
    // contraseña más larga daría una falsa sensación de seguridad.
    body("password").notEmpty().withMessage("password es obligatorio")
        .isLength({ min: 8, max: 72 }).withMessage("La contraseña debe tener entre 8 y 72 caracteres")
        .matches(/[A-Za-z]/).withMessage("La contraseña debe incluir al menos una letra")
        .matches(/\d/).withMessage("La contraseña debe incluir al menos un número"),
    body("role").optional().isIn(["candidate", "recruiter"]).withMessage("role debe ser candidate o recruiter"),
    body("termsAccepted").custom((value) => value === true).withMessage("Debes aceptar la política de privacidad para registrarte")
];

export const loginValidators = [
    body("email").trim().notEmpty().withMessage("email es obligatorio").isEmail().withMessage("email no es válido"),
    body("password").notEmpty().withMessage("password es obligatorio")
];

export const updateProfileValidators = [
    body("name").optional().trim().notEmpty().withMessage("name no puede estar vacío").isLength({ max: 100 }),
    body("sector").optional({ nullable: true }).isString().isLength({ max: 100 }),
    body("phone").optional({ nullable: true }).isString().isLength({ max: 30 }),
    body("location").optional({ nullable: true }).isString().isLength({ max: 120 }),
    body("profile_visible").optional().isBoolean().withMessage("profile_visible debe ser true o false")
];
