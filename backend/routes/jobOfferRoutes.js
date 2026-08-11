import express from "express";
import {
    getJobOffers,
    createNewJobOffer,
    getJobOffer,
    updateExistingJobOffer,
    removeJobOffer
} from "../controllers/jobOfferControllers.js";

import { verifyToken } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();

router.get("/", verifyToken, asyncHandler(getJobOffers));
router.get("/:id", verifyToken, asyncHandler(getJobOffer));
router.post("/", verifyToken, requireRole(["recruiter"]), asyncHandler(createNewJobOffer));
router.put("/:id", verifyToken, requireRole(["recruiter"]), asyncHandler(updateExistingJobOffer));
router.delete("/:id", verifyToken, requireRole(["recruiter"]), asyncHandler(removeJobOffer));

export default router;
