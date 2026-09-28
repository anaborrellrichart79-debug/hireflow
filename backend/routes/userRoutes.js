// routes/userRoutes.js

import express from "express";
import { createNewUser, loginUser, getProfile, updateProfile, deleteProfile, getCv, saveCv, deleteCv } from "../controllers/userControllers.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { loginLimiter } from "../middleware/rateLimiters.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { createUserValidators, loginValidators, updateProfileValidators, saveCvValidators, deleteAccountValidators } from "../validators/userValidators.js";

const router = express.Router();

router.post("/", createUserValidators, validate, asyncHandler(createNewUser));
router.post("/login", loginLimiter, loginValidators, validate, asyncHandler(loginUser));

// Importante: estas rutas van ANTES de cualquier /users/:id que se añada en el futuro,
// para que Express no intente interpretar "me" como un :id.
router.get("/me", verifyToken, asyncHandler(getProfile));
router.put("/me", verifyToken, updateProfileValidators, validate, asyncHandler(updateProfile));
router.delete("/me", verifyToken, deleteAccountValidators, validate, asyncHandler(deleteProfile));

// CV extendido (tabla user_profiles) -- solo candidate, ver docs/decisions.md, entrada 033
router.get("/me/cv", verifyToken, requireRole(["candidate"]), asyncHandler(getCv));
router.put("/me/cv", verifyToken, requireRole(["candidate"]), saveCvValidators, validate, asyncHandler(saveCv));
router.delete("/me/cv", verifyToken, requireRole(["candidate"]), asyncHandler(deleteCv));

export default router;
