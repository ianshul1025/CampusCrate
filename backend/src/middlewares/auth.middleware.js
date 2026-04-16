import { requireAuth, getAuth, clerkClient } from "@clerk/express"
import User from "../models/user.model.js"

export const protect = [
  requireAuth({ signInUrl: false }),
  async (req, res, next) => {
    try {
      const { userId: clerkId } = getAuth(req)

      if (!clerkId) {
        return res.status(401).json({ message: "Not authorized, no Clerk ID available" })
      }

      // Try to find in our DB
      let user = await User.findOne({ clerkId })

      // Auto-create if Clerk-authenticated but not yet in DB
      // This handles the race condition where sync failed or user is new
      if (!user) {
        try {
          const clerkUser = await clerkClient.users.getUser(clerkId)
          const email = clerkUser.emailAddresses?.[0]?.emailAddress || `${clerkId}@clerk.placeholder`
          const firstName = clerkUser.firstName || ""
          const lastName = clerkUser.lastName || ""
          const avatar = clerkUser.imageUrl || ""

          user = await User.create({
            clerkId,
            email,
            firstName,
            lastName,
            avatar,
            role: "user",
            profileCompleted: false
          })
        } catch (createErr) {
          console.error("Auto-sync failed:", createErr)
          return res.status(401).json({
            message: "Not authorized, user profile not found. Please sign out and sign in again.",
            code: "SYNC_FAILED"
          })
        }
      }

      if (user.blocked) {
        return res.status(403).json({
          message: "You have been blocked by the Admin. Please contact the Admin.",
          code: "USER_BLOCKED"
        })
      }

      req.user = user
      next()

    } catch (error) {
      console.error("Auth middleware error:", error)
      res.status(500).json({ message: "Server error during authentication" })
    }
  }
]