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
    const { industry, company_type, lang } = req.body;
    const guides = await findResumeGuides({ industry, company_type, lang });

    res.status(200).json({
        industry,
        company_type: company_type ?? null,
        guides
    });
};

export const interviewQuestions = async (req, res) => {
    const { category, difficulty, limit = 10, lang } = req.body;
    const questions = await findInterviewQuestions({ category, difficulty, limit, lang });

    res.status(200).json({ count: questions.length, questions });
};

export const interviewFeedback = async (req, res) => {
    const { skills, lang } = req.body;
    const suggestions = await findSkillImprovementBySkillNames(skills, lang);

    res.status(200).json({ requested_skills: skills, suggestions });
};

export const jobMatch = async (req, res) => {
    const { job_offer_id, skills, lang } = req.body;

    const jobOffer = await getJobOfferById(job_offer_id);

    if (!jobOffer) {
        return res.status(404).json({ message: "Oferta no encontrada" });
    }

    const { matched, missing, score } = matchJobSkills(jobOffer.skills_required, skills);
    const improvementSuggestions = missing.length > 0
        ? await findSkillImprovementBySkillNames(missing, lang)
        : [];

    res.status(200).json({
        job_offer_id,
        score,
        matched_skills: matched,
        missing_skills: missing,
        improvement_suggestions: improvementSuggestions
    });
};

// Mensajes del asistente en los 4 idiomas de la app (ver docs/decisions.md,
// entrada 028). multipleJobs recibe la lista de títulos.
const MESSAGES = {
    es: {
        offTopic: "Solo puedo ayudarte con temas de búsqueda de empleo en HireFlow: revisar tu CV, prepararte para una entrevista, consejos para mejorar alguna habilidad, o comprobar si encajas con una oferta. ¿Con cuál de estos te ayudo?",
        ambiguous: "No estoy seguro de qué necesitas exactamente. ¿Quieres que revise tu CV, te proponga preguntas de entrevista, te dé consejos para mejorar alguna habilidad, o compruebe si encajas con una oferta concreta?",
        needIndustry: "¿En qué sector o tipo de empresa buscas trabajo? (por ejemplo: startups, banca, sanidad, diseño, ventas, ONG...)",
        needSkill: "¿Sobre qué habilidad te gustaría recibir consejos? (por ejemplo: liderazgo, comunicación, gestión del tiempo, negociación...)",
        needJob: "¿De qué oferta quieres que compruebe el encaje? Dime el título tal como aparece en la pantalla de Ofertas.",
        multipleJobs: (titles) => `Encontré varias ofertas que podrían coincidir: ${titles}. ¿Cuál de ellas te interesa? Escribe el título completo.`
    },
    en: {
        offTopic: "I can only help with job search topics in HireFlow: reviewing your CV, preparing for an interview, tips to improve a skill, or checking whether you match a job offer. Which of these can I help you with?",
        ambiguous: "I'm not sure exactly what you need. Would you like me to review your CV, suggest interview questions, give you tips to improve a skill, or check whether you match a specific job offer?",
        needIndustry: "Which sector or type of company are you looking for work in? (for example: startups, banking, healthcare, design, sales, NGOs...)",
        needSkill: "Which skill would you like tips on? (for example: leadership, communication, time management, negotiation...)",
        needJob: "Which job offer should I check your fit for? Tell me the title exactly as it appears on the Jobs screen.",
        multipleJobs: (titles) => `I found several job offers that could match: ${titles}. Which one are you interested in? Type the full title.`
    },
    fr: {
        offTopic: "Je peux seulement t'aider sur ta recherche d'emploi dans HireFlow : revoir ton CV, préparer un entretien, des conseils pour améliorer une compétence, ou vérifier si tu corresponds à une offre. Sur quoi puis-je t'aider ?",
        ambiguous: "Je ne suis pas sûr de ce dont tu as besoin. Veux-tu que je revoie ton CV, que je te propose des questions d'entretien, que je te donne des conseils pour améliorer une compétence, ou que je vérifie si tu corresponds à une offre précise ?",
        needIndustry: "Dans quel secteur ou quel type d'entreprise cherches-tu un emploi ? (par exemple : startups, banque, santé, design, vente, ONG...)",
        needSkill: "Sur quelle compétence aimerais-tu recevoir des conseils ? (par exemple : leadership, communication, gestion du temps, négociation...)",
        needJob: "Pour quelle offre veux-tu que je vérifie ta compatibilité ? Donne-moi le titre tel qu'il apparaît sur l'écran Offres.",
        multipleJobs: (titles) => `J'ai trouvé plusieurs offres qui pourraient correspondre : ${titles}. Laquelle t'intéresse ? Écris le titre complet.`
    },
    it: {
        offTopic: "Posso aiutarti solo con la ricerca di lavoro su HireFlow: rivedere il tuo CV, prepararti a un colloquio, consigli per migliorare una competenza o verificare se sei adatto a un'offerta. Con quale di questi ti aiuto?",
        ambiguous: "Non sono sicuro di cosa ti serva esattamente. Vuoi che riveda il tuo CV, ti proponga domande da colloquio, ti dia consigli per migliorare una competenza o verifichi se sei adatto a un'offerta precisa?",
        needIndustry: "In quale settore o tipo di azienda cerchi lavoro? (per esempio: startup, banca, sanità, design, vendite, ONG...)",
        needSkill: "Su quale competenza vorresti ricevere consigli? (per esempio: leadership, comunicazione, gestione del tempo, negoziazione...)",
        needJob: "Per quale offerta vuoi che verifichi la tua compatibilità? Dimmi il titolo così come appare nella schermata Offerte.",
        multipleJobs: (titles) => `Ho trovato diverse offerte che potrebbero corrispondere: ${titles}. Quale ti interessa? Scrivi il titolo completo.`
    }
};

// Endpoint conversacional: interpreta una pregunta libre (sin categorías/
// pestañas en el frontend), clasifica la intención por palabras clave y, si
// falta información para responder, devuelve una pregunta de aclaración en
// vez de un error -- ver docs/decisions.md, entrada 014.
export const askAssistant = async (req, res) => {
    const { message } = req.body;
    const lang = req.body.lang || "es";
    const texts = MESSAGES[lang];
    const classification = classifyIntent(message);

    if (classification.intent === "off_topic") {
        return res.status(200).json({ type: "off_topic", message: texts.offTopic });
    }

    if (classification.intent === "ambiguous") {
        return res.status(200).json({ type: "clarify", message: texts.ambiguous });
    }

    if (classification.intent === "cv_review") {
        const industry = extractIndustry(message);

        if (!industry) {
            return res.status(200).json({ type: "clarify", intent: "cv_review", message: texts.needIndustry });
        }

        const guides = await findResumeGuides({ industry, lang });
        return res.status(200).json({ type: "answer", intent: "cv_review", industry, guides });
    }

    if (classification.intent === "interview_questions") {
        const category = extractCategory(message);
        const difficulty = extractDifficulty(message);
        const questions = await findInterviewQuestions({ category, difficulty, limit: 5, lang });
        return res.status(200).json({ type: "answer", intent: "interview_questions", category, difficulty, questions });
    }

    if (classification.intent === "interview_feedback") {
        const skills = extractSkillKeywords(message);

        if (skills.length === 0) {
            return res.status(200).json({ type: "clarify", intent: "interview_feedback", message: texts.needSkill });
        }

        const suggestions = await findSkillImprovementBySkillNames(skills, lang);
        return res.status(200).json({ type: "answer", intent: "interview_feedback", skills, suggestions });
    }

    // job_match
    const jobs = await extractJobMatches(message);

    if (jobs.length === 0) {
        return res.status(200).json({ type: "clarify", intent: "job_match", message: texts.needJob });
    }

    if (jobs.length > 1) {
        const titles = jobs.map((job) => job.title).join(", ");
        return res.status(200).json({
            type: "clarify",
            intent: "job_match",
            message: texts.multipleJobs(titles)
        });
    }

    const job = jobs[0];
    const { matched, missing, score } = matchJobSkills(job.skills_required, message);
    const improvementSuggestions = missing.length > 0
        ? await findSkillImprovementBySkillNames(missing, lang)
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
