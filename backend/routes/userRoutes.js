// routes/userRoutes.js

import express from "express";
import { getUsers, createNewUser, loginUser } from "../controllers/userControllers.js";
import { verifyToken} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", verifyToken, getUsers);
router.post("/", createNewUser);
router.post("/login", loginUser);

export default router;