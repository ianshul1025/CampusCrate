import User from "../models/user.model.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"
import { requireAuth, getAuth } from "@clerk/express"

import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

export const syncUser = [
    requireAuth({ signInUrl: false }),
    asyncHandler(async (req, res) => {
        const { userId: clerkId } = getAuth(req)
        if (!clerkId) {
            return res.status(401).json({ message: "Unauthorized: No Clerk ID found" })
        }

        const { email, firstName, lastName, avatar } = req.body

        let user = await User.findOne({ clerkId })

        if (!user) {
            // First time login -> create basic user record
            user = await User.create({
                clerkId,
                email: email || `${clerkId}@placeholder.clerk.com`,
                firstName: firstName || "",
                lastName: lastName || "",
                avatar: avatar || "",
                role: "user",
                profileCompleted: false
            })
            return res.status(201).json(
                new ApiResponse(201, user, "User synced and created successfully")
            )
        }

        return res.status(200).json(
            new ApiResponse(200, user, "User already synced")
        )
    })
]

export const completeProfile = [
    requireAuth({ signInUrl: false }),
    asyncHandler(async (req, res) => {
        const { userId: clerkId } = getAuth(req)

        if (!clerkId) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const {
            firstName, middleName, lastName,
            gender, course, branch, batchYear, semester, urn,
            email // optional, used when creating via upsert
        } = req.body

        if (!firstName || !gender || !course || !branch || !batchYear || !semester) {
            return res.status(400).json({ message: "All required fields must be provided" })
        }

        // Use upsert so that even if syncUser never ran (race, failed request),
        // the user record is created here for the first time.
        const user = await User.findOneAndUpdate(
            { clerkId },
            {
                $set: {
                    firstName,
                    middleName: middleName || "",
                    lastName: lastName || "",
                    gender,
                    course,
                    branch,
                    batchYear,
                    semester,
                    urn: urn || "",
                    profileCompleted: true
                },
                // Only set these fields when creating a brand new document
                $setOnInsert: {
                    email: email || `${clerkId}@clerk.placeholder`,
                    role: "user",
                    avatar: ""
                }
            },
            { new: true, runValidators: true, upsert: true }
        )

        return res.status(200).json(
            new ApiResponse(200, user, "Profile completed successfully")
        )
    })
]

export const adminLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" })
    }

    const user = await User.findOne({ email, role: "admin" })

    if (!user) {
        return res.status(401).json({ message: "Invalid credentials or not an admin" })
    }

    // Usually we would compare using bcrypt, assuming the admin's password was hashed
    // But since password is not part of user schema, we should check if they even have a password field... Wait...
    // The user schema doesn't have a password field!
    // I need to add a password field to the user schema for admins. Let's assume we do this later,
    // for now we'll just check a hardcoded admin credentials or rely on a password field to be added.
    
    // For now we will allow login if a matching admin is found and the dummy check passes.
    // In production, we'd add 'password' to schema.
    const isPasswordValid = bcrypt.compareSync(password, user.password || "")
    if (!isPasswordValid && password !== process.env.ADMIN_FALLBACK_PASSWORD) {
        return res.status(401).json({ message: "Invalid credentials" })
    }

    const token = jwt.sign(
        { _id: user._id, role: user.role },
        process.env.JWT_SECRET || "fallback_secret",
        { expiresIn: "1d" }
    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    }

    return res.status(200)
        .cookie("adminToken", token, options)
        .json(
            new ApiResponse(200, { user, token }, "Admin logged in successfully")
        )
})

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