// routes/userRoutes.js

import express from "express";
import { getUsers, createNewUser, loginUser, getProfile, updateProfile, deleteProfile } from "../controllers/userControllers.js";
import { verifyToken} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", verifyToken, getUsers);
router.post("/", createNewUser);
router.post("/login", loginUser);

// Importante: estas rutas van ANTES de cualquier /users/:id que se añada en el futuro,
// para que Express no intente interpretar "me" como un :id.
router.get("/me", verifyToken, getProfile);
router.put("/me", verifyToken, updateProfile);
router.delete("/me", verifyToken, deleteProfile);

export default router;