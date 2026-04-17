import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { clerkMiddleware } from "@clerk/express"

import authRoutes from "./routes/auth.route.js"
import userRoutes from "./routes/user.route.js"
import itemRoutes from "./routes/item.route.js"
import claimRoutes from "./routes/claim.route.js"
import messageRoutes from "./routes/message.route.js"
import notificationRoutes from "./routes/notification.route.js"
import adminRoutes from "./routes/admin.route.js"

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
app.use("/api/v1/notifications", notificationRoutes)
app.use("/api/v1/admin", adminRoutes)

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

// Global error handler
app.use((err, req, res, next) => {
    console.error("API Error:", err)
    const statusCode = err?.statusCode || 500
    const message = err?.message || "Internal server error"
    return res.status(statusCode).json({
        success: false,
        message,
        errors: err?.errors || [],
    })
})

export default app