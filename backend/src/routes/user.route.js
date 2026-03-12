import { Router } from "express"
import {
  getCurrentUser,
  getUserProfile,
  updateProfile,
  getAllUsers,
  blockUser
} from "../controllers/user.controller.js"

import { protect } from "../middlewares/auth.middleware.js"
import { isAdmin } from "../middlewares/admin.middleware.js"

const router = Router()

// Logged-in user
router.get("/me", protect, getCurrentUser)

// Get specific user profile
router.get("/:id", protect, getUserProfile)

// Update profile
router.patch("/me/update", protect, updateProfile)

// Admin routes
router.get("/", protect, isAdmin, getAllUsers)
router.patch("/block/:id", protect, isAdmin, blockUser)

export default router