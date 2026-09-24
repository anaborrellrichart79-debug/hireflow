import { db } from "../config/database.js";

export const AI_LANGS = ["es", "en", "fr", "it"];

// El contenido del asistente está en español en sus tablas; las traducciones
// (en, fr, it) viven en ai_content_translations. Sustituye en cada fila los
// campos indicados por su traducción; si falta alguna, se queda el español.
// Ver docs/decisions.md, entrada 028.
const translateRows = async (sourceTable, rows, fields, lang) => {
    if (!lang || lang === "es" || rows.length === 0) {
        return rows;
    }

    const ids = rows.map((row) => row.id);
    const [translations] = await db.query(
        `SELECT source_id, field, content FROM ai_content_translations
         WHERE source_table = ? AND lang = ? AND source_id IN (?) AND field IN (?)`,
        [sourceTable, lang, ids, fields]
    );

    const byKey = new Map(translations.map((t) => [`${t.source_id}:${t.field}`, t.content]));
    return rows.map((row) => {
        const translated = { ...row };
        fields.forEach((field) => {
            const content = byKey.get(`${row.id}:${field}`);
            if (content) translated[field] = content;
        });
        return translated;
    });
};

// CV review: busca guías por industria (+ tipo de empresa si se indica).
// Si no hay coincidencia exacta, cae a las guías genéricas (industry = 'none',
// ya sembradas en database/seed.sql) en vez de devolver una lista vacía.
export const findResumeGuides = async ({ industry, company_type, lang }) => {
    const params = [industry];
    let query = `SELECT * FROM ai_resume_guides WHERE industry = ?`;

    if (company_type) {
        query += ` AND company_type = ?`;
        params.push(company_type);
    }

    const [rows] = await db.execute(query, params);
    const guides = rows.length > 0
        ? rows
        : (await db.execute(`SELECT * FROM ai_resume_guides WHERE industry = 'none'`))[0];

    return translateRows("ai_resume_guides", guides, ["company_type", "recomendations"], lang);
};

// limit se interpola directamente porque ya viene validado como entero
// (1-50) por interviewQuestionsValidators antes de llegar aquí -- LIMIT ?
// como parámetro preparado tiene problemas conocidos de compatibilidad
// en mysql2 según la versión.
export const findInterviewQuestions = async ({ category, difficulty, limit = 10, lang }) => {
    const conditions = [];
    const params = [];

    if (category) {
        conditions.push("category = ?");
        params.push(category);
    }

    if (difficulty) {
        conditions.push("difficulty = ?");
        params.push(difficulty);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const safeLimit = Number.isInteger(limit) ? limit : 10;

    const [rows] = await db.execute(
        `SELECT * FROM ai_interview_questions ${where} ORDER BY RAND() LIMIT ${safeLimit}`,
        params
    );
    return translateRows("ai_interview_questions", rows, ["question"], lang);
};

// Usado tanto por interview-feedback (skills mencionadas explícitamente)
// como por job-match (skills que faltan respecto a una oferta).
export const findSkillImprovementBySkillNames = async (skillNames, lang) => {
    if (!skillNames || skillNames.length === 0) {
        return [];
    }

    const conditions = skillNames.map(() => "skill_name LIKE ?").join(" OR ");
    const params = skillNames.map((name) => `%${name}%`);

    const [rows] = await db.execute(
        `SELECT * FROM ai_skill_improvement WHERE ${conditions}`,
        params
    );
    return translateRows("ai_skill_improvement", rows, ["skill_name", "description", "improvement_methods", "resources"], lang);
};

const tokenize = (text) => {
    if (!text) {
        return [];
    }

    return [...new Set(
        text
            .toLowerCase()
            .split(/[^a-zà-ÿ0-9+.#]+/i)
            .map((token) => token.trim())
            .filter(Boolean)
    )];
};

// Comparación simple por solapamiento de palabras entre lo que pide la
// oferta (skills_required, texto libre) y las skills que aporta el
// candidato (también texto libre, ver docs/decisions.md entrada 010 sobre
// por qué no se lee de user_profiles). No es IA real, es un cálculo local.
export const matchJobSkills = (jobSkillsRequired, candidateSkills) => {
    const required = tokenize(jobSkillsRequired);
    const candidate = tokenize(candidateSkills);

    const matched = required.filter((skill) => candidate.includes(skill));
    const missing = required.filter((skill) => !candidate.includes(skill));
    const score = required.length === 0 ? null : Math.round((matched.length / required.length) * 100);

    return { matched, missing, score };
};
