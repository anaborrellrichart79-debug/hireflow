import express from "express";
import {
    cvReview,
    interviewQuestions,
    interviewFeedback,
    jobMatch,
    askAssistant
} from "../controllers/aiControllers.js";

import { verifyToken } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import {
    cvReviewValidators,
    interviewQuestionsValidators,
    interviewFeedbackValidators,
    jobMatchValidators,
    askValidators
} from "../validators/aiValidators.js";

const router = express.Router();

router.post("/cv-review", verifyToken, cvReviewValidators, validate, asyncHandler(cvReview));
router.post("/interview-questions", verifyToken, interviewQuestionsValidators, validate, asyncHandler(interviewQuestions));
router.post("/interview-feedback", verifyToken, interviewFeedbackValidators, validate, asyncHandler(interviewFeedback));
router.post("/job-match", verifyToken, jobMatchValidators, validate, asyncHandler(jobMatch));
router.post("/ask", verifyToken, askValidators, validate, asyncHandler(askAssistant));

export default router;
