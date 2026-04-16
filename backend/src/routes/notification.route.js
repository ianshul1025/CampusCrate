import { Router } from "express"

import {
    getMyNotifications,
    markRead,
    markAllRead,
    deleteNotification,
    deleteAllNotifications
} from "../controllers/notification.controller.js"

import { protect } from "../middlewares/auth.middleware.js"

const router = Router()

// Get all notifications for current user
router.get("/", protect, getMyNotifications)

// Mark all as read (must be before /:id to avoid route conflict)
router.patch("/read-all", protect, markAllRead)

// Mark single notification as read
router.patch("/:id/read", protect, markRead)

// Delete single notification
router.delete("/:id", protect, deleteNotification)

// Delete all notifications
router.delete("/", protect, deleteAllNotifications)

export default router
