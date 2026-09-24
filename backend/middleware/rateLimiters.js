import { rateLimit } from "express-rate-limit";

// Frena los ataques de fuerza bruta contra el login: como máximo 10 intentos
// FALLIDOS por IP cada 15 minutos. Los logins correctos no cuentan
// (skipSuccessfulRequests), así que un uso normal -- o la herramienta que
// graba la demo, que inicia sesión varias veces seguidas -- nunca lo toca.
// Ver docs/decisions.md, entrada 020.
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Demasiados intentos de inicio de sesión. Vuelve a intentarlo en unos minutos." }
});
