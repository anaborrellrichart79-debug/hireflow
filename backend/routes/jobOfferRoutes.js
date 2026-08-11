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

const router = express.Router();

router.get("/", verifyToken, getJobOffers);
router.get("/:id", verifyToken, getJobOffer);
router.post("/", verifyToken, requireRole(["recruiter"]), createNewJobOffer);
router.put("/:id", verifyToken, requireRole(["recruiter"]), updateExistingJobOffer);
router.delete("/:id", verifyToken, requireRole(["recruiter"]), removeJobOffer);

export default router;
