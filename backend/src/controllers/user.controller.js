import User from "../models/user.model.js"
import Item from "../models/item.model.js"
import Claim from "../models/claim.model.js"
import { Notification } from "../models/notification.model.js"
import { UserReport } from "../models/userReport.model.js"
import ApiResponse from "../utils/ApiResponse.js"
import ApiError from "../utils/ApiError.js"
import asyncHandler from "../utils/asyncHandler.js"
import { emitToRoom } from "../socket.js"

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
    const {
        firstName, middleName, lastName,
        gender, course, branch, batchYear, semester, urn, avatar
    } = req.body

    const user = await User.findById(req.user._id)

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    if (firstName !== undefined) user.firstName = firstName
    if (middleName !== undefined) user.middleName = middleName
    if (lastName !== undefined) user.lastName = lastName
    if (gender !== undefined) user.gender = gender
    if (course !== undefined) user.course = course
    if (branch !== undefined) user.branch = branch
    if (batchYear !== undefined) user.batchYear = batchYear
    if (semester !== undefined) user.semester = semester
    if (urn !== undefined) user.urn = urn
    if (avatar !== undefined) user.avatar = avatar

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

// Toggle Block Chat – POST /users/toggle-block-chat/:itemId
export const toggleBlockChat = asyncHandler(async (req, res) => {
    const targetItemId = req.params.itemId;
    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Initialize array if somehow missing
    if (!user.blockedChats) user.blockedChats = [];

    const isBlocked = user.blockedChats.includes(targetItemId);

    if (isBlocked) {
        // Unblock
        user.blockedChats = user.blockedChats.filter(id => id.toString() !== targetItemId);
    } else {
        // Block
        user.blockedChats.push(targetItemId);
    }

    await user.save();

    // Notify the other user in this chat
    try {
        const item = await Item.findById(targetItemId);
        if (item) {
            const claim = await Claim.findOne({ itemId: targetItemId, status: "approved" });
            if (claim) {
                const reporterId = item.reportedBy.toString();
                const claimantId = claim.claimantId.toString();
                const currentUserId = req.user._id.toString();

                const otherUserId = currentUserId === reporterId ? claimantId : reporterId;

                const notification = await Notification.create({
                    recipient: otherUserId,
                    sender: req.user._id,
                    type: isBlocked ? "CHAT_UNBLOCKED" : "CHAT_BLOCKED",
                    title: isBlocked ? "Chat Unblocked" : "Chat Blocked",
                    message: isBlocked
                        ? `A user has unblocked the chat for item: "${item.title}". Messaging is now restored.`
                        : `A user has blocked the chat for item: "${item.title}". You can no longer send messages in this chat.`,
                    item: item._id
                });

                // Emit real-time notification
                emitToRoom(`user:${otherUserId}`, "new_notification", notification);
            }
        }
    } catch (err) {
        console.error("Failed to send block/unblock notification:", err);
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            { isBlocked: !isBlocked },
            isBlocked ? "Chat unblocked successfully" : "Chat blocked successfully"
        )
    );
});

// Report a user (complaint during chat) – POST /users/report/:userId
export const reportUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { 
        reason, description, itemId, 
        chatId, itemName, reportedUserName, reporterName, lastFiveMessages 
    } = req.body;

    if (!reason && !lastFiveMessages) throw new ApiError(400, "Reason or context is required");
    if (userId === req.user._id.toString()) throw new ApiError(400, "You cannot report yourself");

    const reportedUser = await User.findById(userId);
    if (!reportedUser) throw new ApiError(404, "User not found");

    const report = await UserReport.create({
        reportedBy: req.user._id,
        reportedUser: userId,
        item: itemId || undefined,
        reason: reason || "other",
        description: description?.trim(),
        chatId,
        itemName,
        reportedUserName,
        reporterName,
        lastFiveMessages: lastFiveMessages || []
    });

    return res.status(201).json(
        new ApiResponse(201, report, "Report submitted successfully to Admin.")
    );
});

// Subscribe to push notifications
export const subscribeToPush = asyncHandler(async (req, res) => {
    const { subscription } = req.body;
    if (!subscription) throw new ApiError(400, "Subscription is required");

    const { registerPushSubscription } = await import("../services/webpush.service.js");
    await registerPushSubscription(req.user._id, subscription);

    return res.status(200).json(
        new ApiResponse(200, null, "Subscribed to push notifications")
    );
});