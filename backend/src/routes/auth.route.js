import { Router } from "express"
import { setupProfile, getImageKitAuth } from "../controllers/auth.controller.js"

const router = Router()

// Setup user profile after first-time login
router.post("/profile-setup", setupProfile)

// Provide ImageKit authentication credentials to frontend
router.get("/imagekit-auth", getImageKitAuth)

export default router