import { Notification } from "../models/notification.model.js"

import ApiResponse from "../utils/ApiResponse.js"
import ApiError from "../utils/ApiError.js"
import asyncHandler from "../utils/asyncHandler.js"
import { emitToUser } from "../socket.js"
import { registerPushSubscription, removePushSubscription } from "../services/webpush.service.js"



/*
Get all notifications for the current user – GET /notifications
*/
export const getMyNotifications = asyncHandler(async (req, res) => {

    const notifications = await Notification.find({ recipient: req.user._id })
        .populate("sender", "firstName lastName avatar")
        .populate("item", "title status imageUrl")
        .sort({ createdAt: -1 })
        .limit(50)

    const unreadCount = await Notification.countDocuments({
        recipient: req.user._id,
        isRead: false
    })

    return res.status(200).json(
        new ApiResponse(200, { notifications, unreadCount }, "Notifications fetched")
    )

})



/*
Mark a single notification as read – PATCH /notifications/:id/read
*/
export const markRead = asyncHandler(async (req, res) => {

    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, recipient: req.user._id },
        { isRead: true, readAt: new Date() },
        { new: true }
    )

    if (!notification) {
        throw new ApiError(404, "Notification not found")
    }

    return res.status(200).json(
        new ApiResponse(200, notification, "Notification marked as read")
    )

})



/*
Mark all notifications as read – PATCH /notifications/read-all
*/
export const markAllRead = asyncHandler(async (req, res) => {

    await Notification.updateMany(
        { recipient: req.user._id, isRead: false },
        { isRead: true, readAt: new Date() }
    )

    return res.status(200).json(
        new ApiResponse(200, null, "All notifications marked as read")
    )

})

/*
Delete single notification – DELETE /notifications/:id
*/
export const deleteNotification = asyncHandler(async (req, res) => {

    const notification = await Notification.findOneAndDelete({
        _id: req.params.id,
        recipient: req.user._id
    })

    if (!notification) {
        throw new ApiError(404, "Notification not found")
    }

    return res.status(200).json(
        new ApiResponse(200, null, "Notification deleted")
    )

})

/*
Delete all notifications – DELETE /notifications
*/
export const deleteAllNotifications = asyncHandler(async (req, res) => {

    await Notification.deleteMany({ recipient: req.user._id })

    return res.status(200).json(
        new ApiResponse(200, null, "All notifications deleted")
    )

})

/*
Register a Web Push subscription – POST /notifications/push/subscribe
*/
export const subscribePush = asyncHandler(async (req, res) => {
    const { subscription } = req.body

    if (!subscription?.endpoint || !subscription?.keys) {
        throw new ApiError(400, "Invalid push subscription object")
    }

    await registerPushSubscription(req.user._id, subscription)

    return res.status(200).json(
        new ApiResponse(200, null, "Push subscription registered")
    )
})

/*
Remove a Web Push subscription – POST /notifications/push/unsubscribe
*/
export const unsubscribePush = asyncHandler(async (req, res) => {
    const { endpoint } = req.body

    if (!endpoint) {
        throw new ApiError(400, "Endpoint is required")
    }

    await removePushSubscription(req.user._id, endpoint)

    return res.status(200).json(
        new ApiResponse(200, null, "Push subscription removed")
    )
})

/*
Get VAPID public key – GET /notifications/push/vapid-key
*/
export const getVapidPublicKey = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(200, { publicKey: process.env.VAPID_PUBLIC_KEY }, "VAPID public key")
    )
})
