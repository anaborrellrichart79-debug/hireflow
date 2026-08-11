import { body } from "express-validator";
import { APPLICATION_STATUS } from "../constants/applicationStatus.js";

const STATUS_VALUES = Object.values(APPLICATION_STATUS);

export const createApplicationValidators = [
    body("job_offer_id").optional({ nullable: true }).isInt({ min: 1 }).withMessage("job_offer_id debe ser un entero válido"),
    body("notes").optional({ nullable: true }).isString()
];

// status y notes son obligatorios aquí porque updateApplication (models/application.js)
// sobreescribe ambos campos siempre, no hace un update parcial como el resto de modelos.
export const updateApplicationValidators = [
    body("status").notEmpty().withMessage("status es obligatorio").isIn(STATUS_VALUES).withMessage(`status debe ser una de: ${STATUS_VALUES.join(", ")}`),
    body("notes").optional({ nullable: true }).isString()
];
