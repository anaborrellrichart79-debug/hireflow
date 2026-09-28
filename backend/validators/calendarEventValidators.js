import { body } from "express-validator";
import { msg } from "../i18n/index.js";

const EVENT_TYPES = ["interview", "job_search", "reminder", "meeting"];

export const createCalendarEventValidators = [
    body("title").trim().notEmpty().withMessage(msg("v.required")).isLength({ max: 150 }).withMessage(msg("v.maxLength", { max: 150 })),
    body("description").optional({ nullable: true }).isString().withMessage(msg("v.string")),
    body("event_type").optional().isIn(EVENT_TYPES).withMessage(msg("v.oneOf", { values: EVENT_TYPES.join(", ") })),
    body("related_application").optional({ nullable: true }).isInt({ min: 1 }).withMessage(msg("v.int"))
];

export const updateCalendarEventValidators = [
    body("title").optional().trim().notEmpty().withMessage(msg("v.notEmpty")).isLength({ max: 150 }).withMessage(msg("v.maxLength", { max: 150 })),
    body("description").optional({ nullable: true }).isString().withMessage(msg("v.string")),
    body("event_type").optional().isIn(EVENT_TYPES).withMessage(msg("v.oneOf", { values: EVENT_TYPES.join(", ") })),
    body("related_application").optional({ nullable: true }).isInt({ min: 1 }).withMessage(msg("v.int"))
];
