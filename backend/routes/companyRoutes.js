import express from "express";
import {
    getCompanies,
    createNewCompany,
    getCompany,
    updateExistingCompany,
    removeCompany
} from "../controllers/companyControllers.js";

import { verifyToken } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();

router.get("/", verifyToken, asyncHandler(getCompanies));
router.get("/:id", verifyToken, asyncHandler(getCompany));
router.post("/", verifyToken, requireRole(["recruiter"]), asyncHandler(createNewCompany));
router.put("/:id", verifyToken, requireRole(["recruiter"]), asyncHandler(updateExistingCompany));
router.delete("/:id", verifyToken, requireRole(["recruiter"]), asyncHandler(removeCompany));

export default router;
