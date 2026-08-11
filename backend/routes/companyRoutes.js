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

const router = express.Router();

router.get("/", verifyToken, getCompanies);
router.get("/:id", verifyToken, getCompany);
router.post("/", verifyToken, requireRole(["recruiter"]), createNewCompany);
router.put("/:id", verifyToken, requireRole(["recruiter"]), updateExistingCompany);
router.delete("/:id", verifyToken, requireRole(["recruiter"]), removeCompany);

export default router;
