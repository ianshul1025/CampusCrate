import { Router } from "express"
import { syncUser, completeProfile, getImageKitAuth, adminLogin } from "../controllers/auth.controller.js"

const router = Router()

// Sync Clerk user with MongoDB
router.post("/sync", syncUser)

// Setup user profile after first-time login
router.post("/complete-profile", completeProfile)

// Admin login
router.post("/admin/login", adminLogin)

// Provide ImageKit authentication credentials to frontend
router.get("/imagekit-auth", getImageKitAuth)

export default router