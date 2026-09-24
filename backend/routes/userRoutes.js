// routes/userRoutes.js

import express from "express";
import { createNewUser, loginUser, getProfile, updateProfile, deleteProfile } from "../controllers/userControllers.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { loginLimiter } from "../middleware/rateLimiters.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { createUserValidators, loginValidators, updateProfileValidators } from "../validators/userValidators.js";

const router = express.Router();

router.post("/", createUserValidators, validate, asyncHandler(createNewUser));
router.post("/login", loginLimiter, loginValidators, validate, asyncHandler(loginUser));

// Importante: estas rutas van ANTES de cualquier /users/:id que se añada en el futuro,
// para que Express no intente interpretar "me" como un :id.
router.get("/me", verifyToken, asyncHandler(getProfile));
router.put("/me", verifyToken, updateProfileValidators, validate, asyncHandler(updateProfile));
router.delete("/me", verifyToken, asyncHandler(deleteProfile));

export default router;
