import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { clerkMiddleware } from "@clerk/express"

import authRoutes from "./routes/auth.route.js"
import userRoutes from "./routes/user.route.js"
import itemRoutes from "./routes/item.route.js"
import claimRoutes from "./routes/claim.route.js"
import messageRoutes from "./routes/message.route.js"

const app = express()

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true
}))

// Body parsers
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))

// Static files
app.use(express.static("public"))

// Cookies
app.use(cookieParser())

// Clerk initialization
app.use(clerkMiddleware())

// Routes
app.use("/api/v1/auth", authRoutes)
app.use("/api/v1/users", userRoutes)
app.use("/api/v1/items", itemRoutes)
app.use("/api/v1/claims", claimRoutes)
app.use("/api/v1/messages", messageRoutes)

// Health check route
app.get("/", (req, res) => {
    res.send("CampusCrate API is running 🚀")
})

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    })
})

export default app