import { Router } from "express"

import {
sendMessage,
getItemMessages,
getUserConversations,
getUnreadCount,
markAsRead,
getBlockedConversations
} from "../controllers/message.controller.js"

import { protect } from "../middlewares/auth.middleware.js"

const router = Router()

// Global list (use case: sidebar)
router.get("/", protect, getUserConversations)

// Total unread count (use case: navbar)
router.get("/unread/count", protect, getUnreadCount)

// Blocked conversations
router.get("/blocked", protect, getBlockedConversations)

// Send message
router.post("/:itemId", protect, sendMessage)

// Get matches (item chat)
router.get("/:itemId", protect, getItemMessages)

// Mark item chat as read
router.patch("/:itemId/read", protect, markAsRead)

export default router