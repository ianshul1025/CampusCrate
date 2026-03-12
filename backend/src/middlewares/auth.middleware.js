import { requireAuth } from "@clerk/express"
import User from "../models/user.model.js"

export const protect = [
  requireAuth({ signInUrl: false }),
  async (req, res, next) => {
    try {
      // req.auth is populated by Clerk's requireAuth
      const clerkId = req.auth.userId

      if (!clerkId) {
        return res.status(401).json({ message: "Not authorized, no Clerk ID available" })
      }

      // Attach user to request object
      req.user = await User.findOne({ clerkId })

      if (!req.user) {
        // Here, user exists in Clerk but not fully onboarded in our DB
        return res.status(401).json({ message: "Not authorized, user profile not setup yet", code: "PROFILE_INCOMPLETE" })
      }

      next()

    } catch (error) {
      res.status(500).json({ message: "Server error during authentication" })
    }
  }
]