import express from "express";
import {
    getUserInterviews,
    createNewInterview,
    getInterview,
    updateExistingInterview,
    removeInterview
} from "../controllers/interviewControllers.js";

import { verifyToken } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();

router.get("/", verifyToken, asyncHandler(getUserInterviews));
router.post("/", verifyToken, asyncHandler(createNewInterview));
router.get("/:id", verifyToken, asyncHandler(getInterview));
router.put("/:id", verifyToken, asyncHandler(updateExistingInterview));
router.delete("/:id", verifyToken, asyncHandler(removeInterview));

export default router;
