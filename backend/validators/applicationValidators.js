import { body } from "express-validator";
import { APPLICATION_STATUS } from "../constants/applicationStatus.js";
import { msg } from "../i18n/index.js";

const STATUS_VALUES = Object.values(APPLICATION_STATUS);
// La empresa no puede devolver a nadie a "wishlist" (Interesa): ese estado
// solo tiene sentido para el candidato, antes de postularse.
const RECRUITER_STATUS_VALUES = STATUS_VALUES.filter((status) => status !== APPLICATION_STATUS.WISHLIST);

export const createApplicationValidators = [
    body("job_offer_id").optional({ nullable: true }).isInt({ min: 1 }).withMessage(msg("v.int")),
    body("notes").optional({ nullable: true }).isString().withMessage(msg("v.string")),
    // El consentimiento y la firma son obligatorios: HireFlow comparte nombre,
    // email y teléfono del candidato con la empresa al postularse (nunca datos
    // bancarios ni sensibles) y necesita constancia explícita de que lo acepta.
    body("consent").custom((value) => value === true).withMessage(msg("v.consentRequired")),
    // Compartir el CV es un consentimiento aparte y opcional (desmarcado por defecto)
    body("consent_cv").optional().isBoolean({ strict: true }).withMessage(msg("v.boolean")),
    body("signature").trim().notEmpty().withMessage(msg("v.signatureRequired")).isLength({ max: 150 }).withMessage(msg("v.maxLength", { max: 150 }))
];

// Update parcial: se cambia solo lo que se envía (ver updateApplication).
export const updateApplicationValidators = [
    body("status").optional().isIn(STATUS_VALUES).withMessage(msg("v.oneOf", { values: STATUS_VALUES.join(", ") })),
    body("notes").optional({ nullable: true }).isString().withMessage(msg("v.string"))
];

// Booleanos JSON estrictos: "false" como texto no debe contar como true
export const updateConsentValidators = [
    body("consent_contact").optional().isBoolean({ strict: true }).withMessage(msg("v.boolean")),
    body("consent_cv").optional().isBoolean({ strict: true }).withMessage(msg("v.boolean"))
];

export const updateApplicationStatusValidators = [
    body("status").notEmpty().withMessage(msg("v.required")).isIn(RECRUITER_STATUS_VALUES).withMessage(msg("v.oneOf", { values: RECRUITER_STATUS_VALUES.join(", ") }))
];
