import {
    findResumeGuides,
    findInterviewQuestions,
    findSkillImprovementBySkillNames,
    matchJobSkills
} from "../models/ai.js";
import { getJobOfferById } from "../models/jobOffer.js";

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
