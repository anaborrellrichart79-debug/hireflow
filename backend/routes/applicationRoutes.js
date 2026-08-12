import express from "express";
import {
    getUserApplications,
    createNewApplication,
    getApplication,
    updateExistingApplication,
    removeApplication,
    getRecruiterApplications,
    updateApplicationStatusAsRecruiter,
    markApplicationsSeen
} from "../controllers/applicationControllers.js";

import { verifyToken } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { createApplicationValidators, updateApplicationValidators, updateApplicationStatusValidators } from "../validators/applicationValidators.js";

const router = express.Router();

// Rutas de literal fijo ("/recruiter", "/mark-seen") van antes que "/:id"
// para que Express no las confunda con un id de postulación.
router.get("/", verifyToken, asyncHandler(getUserApplications));
router.get("/recruiter", verifyToken, requireRole(["recruiter"]), asyncHandler(getRecruiterApplications));
router.put("/mark-seen", verifyToken, asyncHandler(markApplicationsSeen));
router.post("/", verifyToken, createApplicationValidators, validate, asyncHandler(createNewApplication));
router.get("/:id", verifyToken, asyncHandler(getApplication));
router.put("/:id", verifyToken, updateApplicationValidators, validate, asyncHandler(updateExistingApplication));
router.put("/:id/status", verifyToken, requireRole(["recruiter"]), updateApplicationStatusValidators, validate, asyncHandler(updateApplicationStatusAsRecruiter));
router.delete("/:id", verifyToken, asyncHandler(removeApplication));

export default router;
