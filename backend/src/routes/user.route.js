import { Router } from "express"
import {
  getCurrentUser,
  getUserProfile,
  updateProfile,
  getAllUsers,
  blockUser,
  toggleBlockChat,
  reportUser
} from "../controllers/user.controller.js"

import { protect } from "../middlewares/auth.middleware.js"
import { verifyAdmin } from "../middlewares/admin.middleware.js"

const router = Router()

// Logged-in user
router.get("/me", protect, getCurrentUser)

// Get specific user profile
router.get("/:id", protect, getUserProfile)

// Update profile
router.patch("/me/update", protect, updateProfile)

// Toggle block chat
router.post("/toggle-block-chat/:itemId", protect, toggleBlockChat)

// Admin routes
router.get("/", verifyAdmin, getAllUsers)
router.patch("/block/:id", verifyAdmin, blockUser)

// Report/flag a user (during chat)
router.post("/report/:userId", protect, reportUser)

export default router