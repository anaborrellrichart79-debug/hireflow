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

const router = express.Router();

router.get("/", verifyToken, asyncHandler(getUserApplications));
router.post("/", verifyToken, asyncHandler(createNewApplication));
router.get("/:id", verifyToken, asyncHandler(getApplication));
router.put("/:id", verifyToken, asyncHandler(updateExistingApplication));
router.delete("/:id", verifyToken, asyncHandler(removeApplication));

export default router;
