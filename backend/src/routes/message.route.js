import { Router } from "express"

import {
sendMessage,
getItemMessages
} from "../controllers/message.controller.js"

import { protect } from "../middlewares/auth.middleware.js"

const router = Router()

// Send message
router.post("/:itemId", protect, sendMessage)

// Get messages of item chat
router.get("/:itemId", protect, getItemMessages)

export default router