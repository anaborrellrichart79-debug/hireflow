import express from "express";
import {
    getCalendarEvents,
    createNewCalendarEvent,
    getCalendarEvent,
    updateExistingCalendarEvent,
    removeCalendarEvent
} from "../controllers/calendarControllers.js";

import { verifyToken } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { createCalendarEventValidators, updateCalendarEventValidators } from "../validators/calendarEventValidators.js";

const router = express.Router();

router.get("/", verifyToken, asyncHandler(getCalendarEvents));
router.post("/", verifyToken, createCalendarEventValidators, validate, asyncHandler(createNewCalendarEvent));
router.get("/:id", verifyToken, asyncHandler(getCalendarEvent));
router.put("/:id", verifyToken, updateCalendarEventValidators, validate, asyncHandler(updateExistingCalendarEvent));
router.delete("/:id", verifyToken, asyncHandler(removeCalendarEvent));

export default router;
