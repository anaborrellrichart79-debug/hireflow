// Traducción de los mensajes de la API (ver docs/decisions.md, entrada 038).
// El idioma sale de la cabecera Accept-Language de cada petición (el frontend
// envía el de la app); sin cabecera, o con un idioma que no hay, español --
// así Postman, curl y cualquier cliente antiguo siguen igual que antes.
import { MESSAGES, FIELD_LABELS } from "./messages.js";

export const SUPPORTED_LANGS = ["es", "en", "fr", "it"];
export const DEFAULT_LANG = "es";

// "fr-FR,fr;q=0.9,en;q=0.8" -> "fr". Se respeta el orden de preferencia (q).
export const detectLang = (header) => {
    if (!header) return DEFAULT_LANG;
    const candidates = String(header)
        .split(",")
        .map((part, index) => {
            const [tag, ...params] = part.trim().split(";");
            const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
            return { lang: tag.trim().slice(0, 2).toLowerCase(), q: q ? Number(q.slice(2)) || 0 : 1, index };
        })
        .filter((c) => c.q > 0)
        .sort((a, b) => b.q - a.q || a.index - b.index);
    return candidates.find((c) => SUPPORTED_LANGS.includes(c.lang))?.lang ?? DEFAULT_LANG;
};

const fill = (template, params) =>
    template.replace(/\{(\w+)\}/g, (match, name) => (params[name] !== undefined ? String(params[name]) : match));

// Clave que falta en un idioma -> la española -> la propia clave
export const translate = (lang, key, params = {}) => {
    const template = MESSAGES[lang]?.[key] ?? MESSAGES[DEFAULT_LANG][key] ?? key;
    return fill(template, params);
};

// "skills[0]" -> "skills": los elementos de una lista usan el nombre de la lista
export const fieldLabel = (lang, path) => {
    const field = String(path ?? "").replace(/\[\d+\]$/, "");
    return FIELD_LABELS[lang]?.[field] ?? FIELD_LABELS[DEFAULT_LANG][field] ?? field;
};

// Middleware global: fija req.lang y req.t(clave, params) para toda la petición
export const langMiddleware = (req, res, next) => {
    req.lang = detectLang(req.get("Accept-Language"));
    req.t = (key, params) => translate(req.lang, key, params);
    // Las respuestas de la API dependen del idioma pedido: que ninguna caché
    // las mezcle (los archivos estáticos no cambian, no hace falta)
    if (req.path.startsWith("/api/")) {
        res.vary("Accept-Language");
    }
    next();
};

// Para express-validator: .withMessage(msg("v.maxLength", { max: 150 })).
// El mensaje se genera al validar, con el idioma de esa petición y el nombre
// visible del campo validado ({field}).
export const msg = (key, params = {}) => (value, { req, path }) => {
    const lang = req.lang ?? DEFAULT_LANG;
    return translate(lang, key, { ...params, field: fieldLabel(lang, path) });
};
