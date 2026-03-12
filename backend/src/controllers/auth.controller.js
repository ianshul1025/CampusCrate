import User from "../models/user.model.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"
import { requireAuth } from "@clerk/express"

export const setupProfile = [
    requireAuth({ signInUrl: false }),
    asyncHandler(async (req, res) => {

        const clerkId = req.auth.userId

        if (!clerkId) {
            return res.status(401).json({ message: "Unauthorized: No Clerk ID" })
        }

        const { name, avatar, branch, batch, urn } = req.body

        if (!name || !branch || !batch || !urn) {
            return res.status(400).json({ message: "Name, Branch, Batch, and URN are required for profile setup" })
        }

        let user = await User.findOne({ clerkId })

        if (user) {
            return res.status(400).json({ message: "User profile already exists" })
        }

        // Create new user profile in MongoDB
        user = await User.create({
            clerkId,
            name,
            branch,
            batch,
            urn,
            avatar: avatar || "",
            // Email is handled by Clerk, but if you need it here, you can extract it
            // Assuming we fetch it or pass it via body if necessary
            email: req.body.email || `${clerkId}@placeholder.clerk.com`
        })

        return res.status(201).json(
            new ApiResponse(201, user, "Profile setup configured successfully")
        )
    })
]

import ImageKit from "imagekit"

export const getImageKitAuth = [
    requireAuth({ signInUrl: false }),
    (req, res) => {
        try {
            const imagekit = new ImageKit({
                urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
                publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
                privateKey: process.env.IMAGEKIT_PRIVATE_KEY
            })

            const authParams = imagekit.getAuthenticationParameters()
            return res.status(200).json(authParams)

        } catch (error) {
            console.error("ImageKit Auth Error:", error)
            return res.status(500).json({ message: "Failed to generate ImageKit auth params" })
        }
    }
]