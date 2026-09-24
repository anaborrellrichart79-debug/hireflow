import { body } from "express-validator";
import { APPLICATION_STATUS } from "../constants/applicationStatus.js";

const STATUS_VALUES = Object.values(APPLICATION_STATUS);
// La empresa no puede devolver a nadie a "wishlist" (Interesa): ese estado
// solo tiene sentido para el candidato, antes de postularse.
const RECRUITER_STATUS_VALUES = STATUS_VALUES.filter((status) => status !== APPLICATION_STATUS.WISHLIST);

export const createApplicationValidators = [
    body("job_offer_id").optional({ nullable: true }).isInt({ min: 1 }).withMessage("job_offer_id debe ser un entero válido"),
    body("notes").optional({ nullable: true }).isString(),
    // El consentimiento y la firma son obligatorios: HireFlow comparte nombre,
    // email y teléfono del candidato con la empresa al postularse (nunca datos
    // bancarios ni sensibles) y necesita constancia explícita de que lo acepta.
    body("consent").custom((value) => value === true).withMessage("Debes aceptar compartir tus datos de contacto con la empresa para postularte"),
    body("signature").trim().notEmpty().withMessage("Debes escribir tu nombre para firmar la postulación").isLength({ max: 150 }).withMessage("La firma no puede superar 150 caracteres")
];

// Update parcial: se cambia solo lo que se envía (ver updateApplication).
export const updateApplicationValidators = [
    body("status").optional().isIn(STATUS_VALUES).withMessage(`status debe ser una de: ${STATUS_VALUES.join(", ")}`),
    body("notes").optional({ nullable: true }).isString()
];

export const updateApplicationStatusValidators = [
    body("status").notEmpty().withMessage("status es obligatorio").isIn(RECRUITER_STATUS_VALUES).withMessage(`status debe ser una de: ${RECRUITER_STATUS_VALUES.join(", ")}`)
];
