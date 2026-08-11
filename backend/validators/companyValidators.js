import { body } from "express-validator";

export const createCompanyValidators = [
    body("name").trim().notEmpty().withMessage("name es obligatorio").isLength({ max: 150 }).withMessage("name no puede superar 150 caracteres"),
    body("email").trim().notEmpty().withMessage("email es obligatorio").isEmail().withMessage("email no es válido").isLength({ max: 150 }),
    body("description").optional({ nullable: true }).isString(),
    body("industry").optional({ nullable: true }).isString().isLength({ max: 120 }),
    body("location").optional({ nullable: true }).isString().isLength({ max: 120 }),
    body("phone").optional({ nullable: true }).isString().isLength({ max: 30 })
];

export const updateCompanyValidators = [
    body("name").optional().trim().notEmpty().withMessage("name no puede estar vacío").isLength({ max: 150 }),
    body("email").optional().trim().notEmpty().isEmail().withMessage("email no es válido").isLength({ max: 150 }),
    body("description").optional({ nullable: true }).isString(),
    body("industry").optional({ nullable: true }).isString().isLength({ max: 120 }),
    body("location").optional({ nullable: true }).isString().isLength({ max: 120 }),
    body("phone").optional({ nullable: true }).isString().isLength({ max: 30 })
];
