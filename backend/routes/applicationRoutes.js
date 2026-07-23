import express from "express";
import { 
    getUserApplications, 
    createNewApplication, 
    getApplication, 
    updateExistingApplication, 
    removeApplication
} from "../controllers/applicationControllers.js";

import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", verifyToken, getUserApplications);
router.post("/", verifyToken, createNewApplication);
router.get("/:id", verifyToken, getApplication);
router.put("/:id", verifyToken, updateExistingApplication);
router.delete("/:id", verifyToken, removeApplication);

export default router;