import { db } from "../config/database.js";

// CV review: busca guías por industria (+ tipo de empresa si se indica).
// Si no hay coincidencia exacta, cae a las guías genéricas (industry = 'none',
// ya sembradas en database/seed.sql) en vez de devolver una lista vacía.
export const findResumeGuides = async ({ industry, company_type }) => {
    const params = [industry];
    let query = `SELECT * FROM ai_resume_guides WHERE industry = ?`;

    if (company_type) {
        query += ` AND company_type = ?`;
        params.push(company_type);
    }

    const [rows] = await db.execute(query, params);

    if (rows.length > 0) {
        return rows;
    }

    const [generic] = await db.execute(
        `SELECT * FROM ai_resume_guides WHERE industry = 'none'`
    );
    return generic;
};

// limit se interpola directamente porque ya viene validado como entero
// (1-50) por interviewQuestionsValidators antes de llegar aquí -- LIMIT ?
// como parámetro preparado tiene problemas conocidos de compatibilidad
// en mysql2 según la versión.
export const findInterviewQuestions = async ({ category, difficulty, limit = 10 }) => {
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
    return rows;
};

// Usado tanto por interview-feedback (skills mencionadas explícitamente)
// como por job-match (skills que faltan respecto a una oferta).
export const findSkillImprovementBySkillNames = async (skillNames) => {
    if (!skillNames || skillNames.length === 0) {
        return [];
    }

    const conditions = skillNames.map(() => "skill_name LIKE ?").join(" OR ");
    const params = skillNames.map((name) => `%${name}%`);

    const [rows] = await db.execute(
        `SELECT * FROM ai_skill_improvement WHERE ${conditions}`,
        params
    );
    return rows;
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
