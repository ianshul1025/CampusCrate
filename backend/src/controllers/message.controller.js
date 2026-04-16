import Message from "../models/message.model.js"
import Item from "../models/item.model.js"
import Claim from "../models/claim.model.js"
import { Notification } from "../models/notification.model.js"
import User from "../models/user.model.js"

import ApiResponse from "../utils/ApiResponse.js"
import ApiError from "../utils/ApiError.js"
import asyncHandler from "../utils/asyncHandler.js"
import { emitToRoom } from "../socket.js"



/*
Send Message – POST /messages/:itemId
Both sides can message freely once ANY approved claim exists for the item.
*/
export const sendMessage = asyncHandler(async (req, res) => {

    const { itemId } = req.params
    const { message } = req.body

    if (!message || !message.trim()) {
        throw new ApiError(400, "Message cannot be empty")
    }

    const item = await Item.findById(itemId).populate("reportedBy", "firstName lastName")

    if (!item) {
        throw new ApiError(404, "Item not found")
    }

    // Find approved claim for this item (involving current user — either as poster or claimant)
    const senderId = req.user._id.toString()
    const posterId = item.reportedBy._id.toString()

    // More precise check: at least one approved claim for this item must exist
    const anyApprovedClaim = await Claim.findOne({ itemId, status: "approved" })

    if (!anyApprovedClaim) {
        throw new ApiError(403, "Chat not available until a claim has been approved for this item")
    }

    // Only the poster and the approved claimant(s) may send messages
    const claimantId = anyApprovedClaim.claimantId.toString()
    const isParticipant = senderId === posterId || senderId === claimantId

    if (!isParticipant) {
        throw new ApiError(403, "You are not a participant in this chat")
    }

    // Determine receiver
    const receiverId = senderId === posterId ? anyApprovedClaim.claimantId : item.reportedBy._id

    // Check if either user has blocked the other
    const sender = await User.findById(req.user._id);
    const receiver = await User.findById(receiverId);

    if (sender.blockedChats?.includes(itemId)) {
        throw new ApiError(403, "You have blocked this chat");
    }
    if (receiver.blockedChats?.includes(itemId)) {
        throw new ApiError(403, "This chat has been blocked by the other user");
    }

    const newMessage = await Message.create({
        item: itemId,
        sender: req.user._id,
        receiver,
        message: message.trim()
    })

    // Populate sender for response
    await newMessage.populate("sender", "firstName lastName avatar")

    // Send NEW_MESSAGE notification to receiver
    await Notification.create({
        recipient: receiver,
        sender: req.user._id,
        type: "NEW_MESSAGE",
        title: `New message: ${item.title}`,
        message: message.trim().length > 60
            ? message.trim().slice(0, 60) + "…"
            : message.trim(),
        item: item._id
    })

    // Emit real-time message to the specific chat room
    emitToRoom(`chat:${itemId}`, "new_message", {
        ...newMessage.toObject(),
        isMe: false
    })

    // Also emit to the receiver's private room (for global unread count in Navbar)
    emitToRoom(`user:${receiver}`, "new_message", {
        ...newMessage.toObject(),
        isMe: false
    })

    return res.status(201).json(
        new ApiResponse(201, newMessage, "Message sent")
    )

})



/*
Get chat messages – GET /messages/:itemId
Returns all messages for this item chat. Requires approved claim.
*/
export const getItemMessages = asyncHandler(async (req, res) => {

    const { itemId } = req.params

    // Verify an approved claim exists for this item
    const anyApprovedClaim = await Claim.findOne({ itemId, status: "approved" })

    if (!anyApprovedClaim) {
        throw new ApiError(403, "Chat not available until a claim has been approved")
    }

    // Only participants may read messages
    const item = await Item.findById(itemId)
    if (!item) throw new ApiError(404, "Item not found")

    const senderId = req.user._id.toString()
    const posterId = item.reportedBy.toString()
    const claimantId = anyApprovedClaim.claimantId.toString()

    if (senderId !== posterId && senderId !== claimantId) {
        throw new ApiError(403, "You are not a participant in this chat")
    }

    const messages = await Message.find({ item: itemId })
        .populate("sender", "firstName lastName avatar clerkId")
        .sort({ createdAt: 1 })

    return res.status(200).json(
        new ApiResponse(200, messages, "Messages fetched")
    )

})



/*
Get all conversations for the user – GET /messages
Returns list of items with latest message and unread count.
*/
export const getUserConversations = asyncHandler(async (req, res) => {
    const userId = req.user._id

    const user = await User.findById(req.user._id);
    const blockedChats = user.blockedChats || [];
    
    // Get all items user is involved with (poster or claimant)
    const itemsOwnedIds = await Item.find({ reportedBy: userId }).distinct("_id")

    // Find all approved claims for items owned by user OR claims made by user
    const claims = await Claim.find({
        status: "approved",
        $or: [
            { claimantId: userId },
            { itemId: { $in: itemsOwnedIds } }
        ]
    }).populate({
        path: "itemId",
        select: "title imageUrl status location reportedBy state createdAt"
    })

    const conversations = []

    for (const claim of claims) {
        if (!claim.itemId) continue;

        const itemId = claim.itemId._id
        const reporterId = claim.itemId.reportedBy.toString();
        const otherParticipantId = reporterId === userId.toString() ? claim.claimantId.toString() : reporterId;

        // Skip if either user has blocked the chat
        // 1. I blocked this chat
        if (blockedChats.includes(itemId.toString())) continue;
        
        // 2. They blocked this chat
        const otherUser = await User.findById(otherParticipantId);
        if (otherUser?.blockedChats?.includes(itemId.toString())) continue;

        // Get latest message for this item
        const latestMessage = await Message.findOne({ item: itemId })
            .sort({ createdAt: -1 })
            .populate("sender", "firstName lastName avatar")

        // Get unread count for this item (sent to me)
        const unreadCount = await Message.countDocuments({
            item: itemId,
            receiver: userId,
            read: false
        })

        conversations.push({
            item: claim.itemId,
            otherUser: {
                _id: otherUser._id,
                firstName: otherUser.firstName,
                lastName: otherUser.lastName,
                avatar: otherUser.avatar,
                clerkId: otherUser.clerkId
            },
            latestMessage,
            unreadCount
        })
    }

    // Sort by latest message date (desc)
    conversations.sort((a, b) => {
        const dateA = a.latestMessage?.createdAt || 0
        const dateB = b.latestMessage?.createdAt || 0
        return new Date(dateB) - new Date(dateA)
    })

    return res.status(200).json(
        new ApiResponse(200, conversations, "Conversations fetched")
    )
})



/*
Get total unread count across all chats – GET /messages/unread/count
*/
export const getUnreadCount = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    const myBlocked = user.blockedChats || [];

    const unreadItemIds = await Message.distinct("item", {
        receiver: req.user._id,
        read: false,
        item: { $nin: myBlocked }
    })

    if (unreadItemIds.length === 0) {
        return res.status(200).json(new ApiResponse(200, { unreadCount: 0 }, "Unread count fetched"));
    }

    // Filter out chats where the other user blocked it too
    let finalCount = 0;
    for (const itemId of unreadItemIds) {
        const item = await Item.findById(itemId);
        if (!item) continue;

        const claim = await Claim.findOne({ itemId, status: "approved" });
        if (!claim) continue;

        const otherId = req.user._id.toString() === item.reportedBy.toString() ? claim.claimantId : item.reportedBy;
        const otherUser = await User.findById(otherId);
        
        if (otherUser?.blockedChats?.includes(itemId.toString())) continue;
        
        finalCount++;
    }

    return res.status(200).json(
        new ApiResponse(200, { unreadCount: finalCount }, "Unread conversation count fetched")
    )
})



/*
Mark a specific chat as read – PATCH /messages/:itemId/read
*/
export const markAsRead = asyncHandler(async (req, res) => {
    const { itemId } = req.params

    await Message.updateMany(
        { item: itemId, receiver: req.user._id, read: false },
        { $set: { read: true } }
    )

    return res.status(200).json(
        new ApiResponse(200, {}, "Messages marked as read")
    )
})

/*
Get blocked conversations – GET /messages/blocked
*/
export const getBlockedConversations = asyncHandler(async (req, res) => {
    const userId = req.user._id
    const user = await User.findById(userId);
    const blockedChats = user.blockedChats || [];

    if (blockedChats.length === 0) {
        return res.status(200).json(new ApiResponse(200, [], "No blocked conversations"));
    }

    // Get all items user is involved with (poster or claimant)
    const itemsOwnedIds = await Item.find({ reportedBy: userId }).distinct("_id")
    
    // Find all approved claims where the ITEM is in our blocked list
    const claims = await Claim.find({
        status: "approved",
        itemId: { $in: blockedChats },
        $or: [
            { claimantId: userId, itemId: { $exists: true } }, // I am claimant
            { itemId: { $in: itemsOwnedIds } } // I am owner
        ]
    }).populate({
        path: "itemId",
        select: "title imageUrl status location reportedBy state createdAt"
    })

    const conversations = []

    for (const claim of claims) {
        if (!claim.itemId) continue;

        const itemId = claim.itemId._id
        const latestMessage = await Message.findOne({ item: itemId })
            .sort({ createdAt: -1 })
            .populate("sender", "firstName lastName avatar")

        conversations.push({
            item: claim.itemId,
            latestMessage,
            unreadCount: 0 // Typically don't care about unread in blocked
        })
    }

    return res.status(200).json(
        new ApiResponse(200, conversations, "Blocked conversations fetched")
    )
})
