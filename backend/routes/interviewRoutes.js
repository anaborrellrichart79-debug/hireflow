import express from "express";
import {
    getUserInterviews,
    createNewInterview,
    getInterview,
    updateExistingInterview,
    removeInterview
} from "../controllers/interviewControllers.js";

import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", verifyToken, getUserInterviews);
router.post("/", verifyToken, createNewInterview);
router.get("/:id", verifyToken, getInterview);
router.put("/:id", verifyToken, updateExistingInterview);
router.delete("/:id", verifyToken, removeInterview);

export default router;
