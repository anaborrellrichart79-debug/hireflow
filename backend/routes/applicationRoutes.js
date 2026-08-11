import express from "express";
import {
    getUserApplications,
    createNewApplication,
    getApplication,
    updateExistingApplication,
    removeApplication
} from "../controllers/applicationControllers.js";

import { verifyToken } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { createApplicationValidators, updateApplicationValidators } from "../validators/applicationValidators.js";

const router = express.Router();

router.get("/", verifyToken, asyncHandler(getUserApplications));
router.post("/", verifyToken, createApplicationValidators, validate, asyncHandler(createNewApplication));
router.get("/:id", verifyToken, asyncHandler(getApplication));
router.put("/:id", verifyToken, updateApplicationValidators, validate, asyncHandler(updateExistingApplication));
router.delete("/:id", verifyToken, asyncHandler(removeApplication));

export default router;
