import User from "../models/user.model.js"
import ApiResponse from "../utils/ApiResponse.js"
import ApiError from "../utils/ApiError.js"
import asyncHandler from "../utils/asyncHandler.js"



// Get logged-in user
export const getCurrentUser = asyncHandler(async (req, res) => {

    const user = await User.findById(req.user._id)

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    return res.status(200).json(
        new ApiResponse(200, user, "User fetched successfully")
    )

})



// Get user profile
export const getUserProfile = asyncHandler(async (req, res) => {

    const user = await User.findById(req.params.id).select("-googleId")

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    return res.status(200).json(
        new ApiResponse(200, user, "User profile fetched")
    )

})



// Update user profile
export const updateProfile = asyncHandler(async (req, res) => {

    const { name, avatar, branch, batch, urn } = req.body

    const user = await User.findById(req.user._id)

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    if (name) user.name = name
    if (avatar) user.avatar = avatar
    if (branch) user.branch = branch
    if (batch) user.batch = batch
    if (urn) user.urn = urn

    await user.save()

    return res.status(200).json(
        new ApiResponse(200, user, "Profile updated")
    )

})



// Admin: get all users
export const getAllUsers = asyncHandler(async (req, res) => {

    const users = await User.find().sort({ createdAt: -1 })

    return res.status(200).json(
        new ApiResponse(200, users, "All users fetched")
    )

})



// Admin: block user
export const blockUser = asyncHandler(async (req, res) => {

    const user = await User.findById(req.params.id)

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    user.blocked = true

    await user.save()

    return res.status(200).json(
        new ApiResponse(200, null, "User blocked successfully")
    )

})