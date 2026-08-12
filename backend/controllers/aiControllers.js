import {
    findResumeGuides,
    findInterviewQuestions,
    findSkillImprovementBySkillNames,
    matchJobSkills
} from "../models/ai.js";
import { getJobOfferById } from "../models/jobOffer.js";
import {
    classifyIntent,
    extractIndustry,
    extractCategory,
    extractDifficulty,
    extractSkillKeywords,
    extractJobMatches
} from "../models/aiAssistant.js";

export const cvReview = async (req, res) => {
    const { industry, company_type } = req.body;
    const guides = await findResumeGuides({ industry, company_type });

    res.status(200).json({
        industry,
        company_type: company_type ?? null,
        guides
    });
};

export const interviewQuestions = async (req, res) => {
    const { category, difficulty, limit = 10 } = req.body;
    const questions = await findInterviewQuestions({ category, difficulty, limit });

    res.status(200).json({ count: questions.length, questions });
};

export const interviewFeedback = async (req, res) => {
    const { skills } = req.body;
    const suggestions = await findSkillImprovementBySkillNames(skills);

    res.status(200).json({ requested_skills: skills, suggestions });
};

export const jobMatch = async (req, res) => {
    const { job_offer_id, skills } = req.body;

    const jobOffer = await getJobOfferById(job_offer_id);

    if (!jobOffer) {
        return res.status(404).json({ message: "Oferta no encontrada" });
    }

    const { matched, missing, score } = matchJobSkills(jobOffer.skills_required, skills);
    const improvementSuggestions = missing.length > 0
        ? await findSkillImprovementBySkillNames(missing)
        : [];

    res.status(200).json({
        job_offer_id,
        score,
        matched_skills: matched,
        missing_skills: missing,
        improvement_suggestions: improvementSuggestions
    });
};

const OFF_TOPIC_MESSAGE = "Solo puedo ayudarte con temas de búsqueda de empleo en HireFlow: revisar tu CV, prepararte para una entrevista, consejos para mejorar alguna habilidad, o comprobar si encajas con una oferta. ¿Con cuál de estos te ayudo?";
const AMBIGUOUS_MESSAGE = "No estoy seguro de qué necesitas exactamente. ¿Quieres que revise tu CV, te proponga preguntas de entrevista, te dé consejos para mejorar alguna habilidad, o compruebe si encajas con una oferta concreta?";
const NEED_INDUSTRY_MESSAGE = "¿En qué sector o tipo de empresa buscas trabajo? (por ejemplo: startups, banca, sanidad, diseño, ventas, ONG...)";
const NEED_SKILL_MESSAGE = "¿Sobre qué habilidad te gustaría recibir consejos? (por ejemplo: liderazgo, comunicación, gestión del tiempo, negociación...)";
const NEED_JOB_MESSAGE = "¿De qué oferta quieres que compruebe el encaje? Dime el título tal como aparece en la pantalla de Ofertas.";

// Endpoint conversacional: interpreta una pregunta libre (sin categorías/
// pestañas en el frontend), clasifica la intención por palabras clave y, si
// falta información para responder, devuelve una pregunta de aclaración en
// vez de un error -- ver docs/decisions.md, entrada 014.
export const askAssistant = async (req, res) => {
    const { message } = req.body;
    const classification = classifyIntent(message);

    if (classification.intent === "off_topic") {
        return res.status(200).json({ type: "off_topic", message: OFF_TOPIC_MESSAGE });
    }

    if (classification.intent === "ambiguous") {
        return res.status(200).json({ type: "clarify", message: AMBIGUOUS_MESSAGE });
    }

    if (classification.intent === "cv_review") {
        const industry = extractIndustry(message);

        if (!industry) {
            return res.status(200).json({ type: "clarify", intent: "cv_review", message: NEED_INDUSTRY_MESSAGE });
        }

        const guides = await findResumeGuides({ industry });
        return res.status(200).json({ type: "answer", intent: "cv_review", industry, guides });
    }

    if (classification.intent === "interview_questions") {
        const category = extractCategory(message);
        const difficulty = extractDifficulty(message);
        const questions = await findInterviewQuestions({ category, difficulty, limit: 5 });
        return res.status(200).json({ type: "answer", intent: "interview_questions", category, difficulty, questions });
    }

    if (classification.intent === "interview_feedback") {
        const skills = extractSkillKeywords(message);

        if (skills.length === 0) {
            return res.status(200).json({ type: "clarify", intent: "interview_feedback", message: NEED_SKILL_MESSAGE });
        }

        const suggestions = await findSkillImprovementBySkillNames(skills);
        return res.status(200).json({ type: "answer", intent: "interview_feedback", skills, suggestions });
    }

    // job_match
    const jobs = await extractJobMatches(message);

    if (jobs.length === 0) {
        return res.status(200).json({ type: "clarify", intent: "job_match", message: NEED_JOB_MESSAGE });
    }

    if (jobs.length > 1) {
        const titles = jobs.map((job) => job.title).join(", ");
        return res.status(200).json({
            type: "clarify",
            intent: "job_match",
            message: `Encontré varias ofertas que podrían coincidir: ${titles}. ¿Cuál de ellas te interesa? Escribe el título completo.`
        });
    }

    const job = jobs[0];
    const { matched, missing, score } = matchJobSkills(job.skills_required, message);
    const improvementSuggestions = missing.length > 0
        ? await findSkillImprovementBySkillNames(missing)
        : [];

    res.status(200).json({
        type: "answer",
        intent: "job_match",
        job_offer_id: job.id,
        job_title: job.title,
        score,
        matched_skills: matched,
        missing_skills: missing,
        improvement_suggestions: improvementSuggestions
    });
};
