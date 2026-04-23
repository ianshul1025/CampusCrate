import Message from "../models/message.model.js"
import Item from "../models/item.model.js"
import Claim from "../models/claim.model.js"
import { Notification } from "../models/notification.model.js"
import User from "../models/user.model.js"
import { Conversation } from "../models/conversation.model.js"

import ApiResponse from "../utils/ApiResponse.js"
import ApiError from "../utils/ApiError.js"
import asyncHandler from "../utils/asyncHandler.js"
import { emitToRoom, emitToUser, isUserOnline } from "../socket.js"
import { sendPushToUser } from "../services/webpush.service.js"



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

    // Find approved claim for this item
    const senderId = req.user._id.toString()
    const posterId = item.reportedBy._id.toString()
    
    // Explicitly allow passing receiverId from body to handle multiple claimers
    let { receiverId } = req.body

    if (!receiverId) {
        // Fallback logic if receiverId is not provided
        const anyApprovedClaim = await Claim.findOne({ itemId, status: "approved" })
        if (!anyApprovedClaim) {
            throw new ApiError(403, "Chat not available until a claim has been approved for this item")
        }
        receiverId = senderId === posterId ? anyApprovedClaim.claimantId.toString() : posterId
    }

    // Verify participant validity
    const isPoster = senderId === posterId || receiverId === posterId
    const isApprovedClaimant = await Claim.findOne({ 
        itemId, 
        status: "approved", 
        claimantId: senderId === posterId ? receiverId : senderId 
    })

    if (!isPoster || !isApprovedClaimant) {
        throw new ApiError(403, "You are not a participant in this conversation. Only the approved claimant and the item poster can chat.")
    }

    // Check block status
    const sender = await User.findById(req.user._id)
    const receiver = await User.findById(receiverId)

    if (sender.blockedChats?.includes(itemId)) {
        throw new ApiError(403, "You have blocked this chat")
    }
    if (receiver.blockedChats?.includes(itemId)) {
        throw new ApiError(403, "This chat has been blocked by the other user")
    }

    // Find or create conversation for THIS SPECIFIC ITEM and participant pair
    let conversation = await Conversation.findOne({
        item: itemId,
        participants: { $all: [senderId, receiverId] }
    })

    if (!conversation) {
        conversation = await Conversation.create({
            item: itemId,
            participants: [senderId, receiverId]
        })
    }

    const newMessage = await Message.create({
        sender: senderId,
        receiver: receiverId,
        item: itemId,
        conversation: conversation._id,
        message: message.trim(),
        status: isUserOnline(receiverId) ? "delivered" : "sent"
    })

    // Update conversation latest message
    conversation.latestMessage = newMessage._id
    await conversation.save()

    await newMessage.populate("sender", "firstName lastName avatar")

    // Determine initial status: if receiver is online -> "delivered", else "sent"
    const receiverOnline = isUserOnline(receiverId.toString())
    if (receiverOnline) {
        newMessage.status = "delivered"
        newMessage.read = false
        await newMessage.save()
    }

    // Emit real-time message ONLY to the specific receiver's private room
    const messagePayload = newMessage.toObject()

    // Emit status update back to sender's room
    emitToUser(senderId, "message_status", {
        messageId: newMessage._id,
        conversationId: conversation._id,
        status: newMessage.status
    })

    // Also emit to the receiver's private room for unread count / sidebar
    emitToUser(receiverId.toString(), "new_message", { ...messagePayload, isMe: false })

    // Create in-app notification (only when receiver is NOT currently viewing the chat)
    const notification = await Notification.create({
        recipient: receiverId,
        sender: req.user._id,
        type: "NEW_MESSAGE",
        title: `New message: ${item.title}`,
        message: message.trim().length > 60
            ? message.trim().slice(0, 60) + "…"
            : message.trim(),
        item: item._id
    })

    // Populate notification for real-time push
    await notification.populate("sender", "firstName lastName avatar")
    await notification.populate("item", "title status imageUrl")

    // Push real-time notification to receiver's socket
    emitToUser(receiverId.toString(), "new_notification", notification.toObject())

    // Web Push if receiver is offline
    if (!receiverOnline) {
        sendPushToUser(receiverId.toString(), {
            title: `New message from ${sender.firstName}`,
            body: message.trim().length > 100
                ? message.trim().slice(0, 100) + "…"
                : message.trim(),
            icon: "/icon-192x192.png",
            badge: "/badge-72x72.png",
            data: {
                url: `/messages/${itemId}`
            }
        }).catch(console.error)
    }

    return res.status(201).json(
        new ApiResponse(201, newMessage, "Message sent")
    )

})



/*
Get chat messages – GET /messages/:itemId
Returns all messages for this item chat. Requires approved claim.
When the receiver fetches messages, marks all "sent" messages as "delivered".
*/
export const getItemMessages = asyncHandler(async (req, res) => {

    const { itemId } = req.params
    const { otherUserId: queryOtherUserId } = req.query
    const currentUserId = req.user._id.toString()

    const item = await Item.findById(itemId)
    if (!item) throw new ApiError(404, "Item not found")

    const posterId = item.reportedBy.toString()
    let otherUserId = queryOtherUserId

    if (!otherUserId) {
        // If not provided, try to infer it. 
        // If I'm NOT the poster, the other user is the poster.
        if (currentUserId !== posterId) {
            otherUserId = posterId
        } else {
            // I'm the poster, I need to know WHO I want to chat with.
            // Fallback to the first approved claim if nothing else.
            const anyApprovedClaim = await Claim.findOne({ itemId, status: "approved" })
            if (!anyApprovedClaim) {
                throw new ApiError(403, "Chat not available until a claim has been approved")
            }
            otherUserId = anyApprovedClaim.claimantId.toString()
        }
    }

    // Verify participants
    const isParticipant = (currentUserId === posterId && await Claim.findOne({ itemId, claimantId: otherUserId, status: "approved" })) ||
                          (otherUserId === posterId && await Claim.findOne({ itemId, claimantId: currentUserId, status: "approved" }))

    if (!isParticipant) {
        throw new ApiError(403, "You are not a participant in this conversation")
    }

    const otherUserFull = await User.findById(otherUserId).select("firstName lastName avatar")

    // Find the conversation specifically for this item
    const conversation = await Conversation.findOne({
        item: itemId,
        participants: { $all: [currentUserId, otherUserId] }
    })

    const query = conversation 
        ? { conversation: conversation._id }
        : { 
            item: itemId,
            $or: [
                { sender: currentUserId, receiver: otherUserId },
                { sender: otherUserId, receiver: currentUserId }
            ]
        }

    const messages = await Message.find(query)
        .populate("sender", "firstName lastName avatar clerkId")
        .sort({ createdAt: 1 })

    // Mark all "sent" messages addressed to current user as "delivered"
    const sentToMe = messages.filter(
        m => m.status === "sent" && m.receiver.toString() === currentUserId
    )

    if (sentToMe.length > 0) {
        const ids = sentToMe.map(m => m._id)
        await Message.updateMany(
            { _id: { $in: ids } },
            { $set: { status: "delivered" } }
        )

        // Emit individual status updates to the message sender
        for (const msg of sentToMe) {
            emitToUser(otherUserId, "message_status", {
                messageId: msg._id,
                conversationId: conversation?._id,
                status: "delivered"
            })
            // Update in-memory so the response reflects current state
            msg.status = "delivered"
        }
    }

    return res.status(200).json(
        new ApiResponse(200, { 
            messages, 
            conversationId: conversation?._id,
            otherUser: {
                _id: otherUserId,
                firstName: otherUserFull?.firstName || "User",
                lastName: otherUserFull?.lastName || "",
                avatar: otherUserFull?.avatar || ""
            }
        }, "Messages fetched")
    )

})



/*
Get all conversations for the user – GET /messages
Returns list of items with latest message and unread count.
*/
export const getUserConversations = asyncHandler(async (req, res) => {
    const userId = req.user._id

    // 1. Get all approved claims for this user (either as poster or claimant)
    const itemsOwnedIds = await Item.find({ reportedBy: userId }).distinct("_id")
    const approvedClaims = await Claim.find({
        status: "approved",
        $or: [
            { claimantId: userId },
            { itemId: { $in: itemsOwnedIds } }
        ]
    })

    // 2. Ensure each approved claim has a conversation record
    for (const claim of approvedClaims) {
        const item = await Item.findById(claim.itemId)
        if (!item) continue
        
        const posterId = item.reportedBy
        const claimantId = claim.claimantId

        let conversation = await Conversation.findOne({
            participants: { $all: [posterId, claimantId] }
        })

        if (!conversation) {
            await Conversation.create({
                item: item._id,
                participants: [posterId, claimantId]
            })
        }
    }

    // 3. Now fetch all conversations where the user is a participant
    const dbConversations = await Conversation.find({
        participants: userId
    })
    .populate("participants", "firstName lastName avatar clerkId")
    .populate("item", "title imageUrl state reportedBy")
    .populate({
        path: "latestMessage",
        populate: { path: "sender", select: "firstName lastName avatar" }
    })
    .sort({ updatedAt: -1 })

    const user = await User.findById(userId)
    const blockedItems = user.blockedChats?.map(id => id.toString()) || []

    const conversations = []

    for (const conv of dbConversations) {
        const otherUser = conv.participants.find(p => p._id.toString() !== userId.toString())
        if (!otherUser) continue

        if (conv.item && blockedItems.includes(conv.item._id.toString())) continue

        // Check if other user blocked this item too
        const otherUserFull = await User.findById(otherUser._id)
        if (conv.item && otherUserFull?.blockedChats?.map(id => id.toString()).includes(conv.item._id.toString())) continue

        // Get unread count for THIS user in THIS conversation
        const unreadCount = await Message.countDocuments({
            conversation: conv._id,
            receiver: userId,
            status: { $in: ["sent", "delivered"] }
        })

        conversations.push({
            _id: conv._id,
            item: conv.item,
            otherUser: otherUser,
            latestMessage: conv.latestMessage,
            unreadCount
        })
    }

    return res.status(200).json(
        new ApiResponse(200, conversations, "Conversations fetched")
    )
})







/*
Mark a specific chat as read – PATCH /messages/:itemId/read
Advances status from sent/delivered → read and notifies sender via socket.
*/
export const markAsRead = asyncHandler(async (req, res) => {
    const { itemId } = req.params
    const { otherUserId: queryOtherUserId } = req.query
    const currentUserId = req.user._id.toString()

    const item = await Item.findById(itemId)
    if (!item) throw new ApiError(404, "Item not found")

    const posterId = item.reportedBy.toString()
    let otherUserId = queryOtherUserId

    if (!otherUserId) {
        if (currentUserId !== posterId) {
            otherUserId = posterId
        } else {
            const anyApprovedClaim = await Claim.findOne({ itemId, status: "approved" })
            if (!anyApprovedClaim) throw new ApiError(403, "No approved claim found")
            otherUserId = anyApprovedClaim.claimantId.toString()
        }
    }

    // Find the conversation
    const conversation = await Conversation.findOne({
        item: itemId,
        participants: { $all: [currentUserId, otherUserId] }
    })

    // Find all unread messages in this conversation addressed to current user
    const unreadMessages = await Message.find({
        conversation: conversation?._id,
        receiver: req.user._id,
        status: { $in: ["sent", "delivered"] }
    })

    if (unreadMessages.length === 0) {
        return res.status(200).json(new ApiResponse(200, {}, "No unread messages"))
    }

    const ids = unreadMessages.map(m => m._id)

    // Bulk update to "read"
    await Message.updateMany(
        { _id: { $in: ids } },
        { $set: { status: "read", read: true } }
    )

    // Collect unique senders to notify
    const senderIds = [...new Set(unreadMessages.map(m => m.sender.toString()))]

    // Emit status updates to each sender
    for (const senderId of senderIds) {
        if (senderId === currentUserId) continue
        for (const msg of unreadMessages.filter(m => m.sender.toString() === senderId)) {
            emitToUser(senderId, "message_status", {
                messageId: msg._id,
                conversationId: conversation?._id,
                status: "read"
            })
        }
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Messages marked as read")
    )
})

/*
Get blocked conversations – GET /messages/blocked
*/
export const getBlockedConversations = asyncHandler(async (req, res) => {
    const userId = req.user._id
    const user = await User.findById(userId)
    const blockedChats = user.blockedChats || []

    if (blockedChats.length === 0) {
        return res.status(200).json(new ApiResponse(200, [], "No blocked conversations"))
    }

    const itemsOwnedIds = await Item.find({ reportedBy: userId }).distinct("_id")
    
    const claims = await Claim.find({
        status: "approved",
        itemId: { $in: blockedChats },
        $or: [
            { claimantId: userId, itemId: { $exists: true } },
            { itemId: { $in: itemsOwnedIds } }
        ]
    }).populate({
        path: "itemId",
        select: "title imageUrl status location reportedBy state createdAt"
    })

    const conversations = []

    for (const claim of claims) {
        if (!claim.itemId) continue

        const itemId = claim.itemId._id
        const latestMessage = await Message.findOne({ item: itemId })
            .sort({ createdAt: -1 })
            .populate("sender", "firstName lastName avatar")

        conversations.push({
            item: claim.itemId,
            latestMessage,
            unreadCount: 0
        })
    }

    return res.status(200).json(
        new ApiResponse(200, conversations, "Blocked conversations fetched")
    )
})

/*
Total unread count for navbar – GET /messages/unread/count
Counts how many unique conversations have unread messages for the user.
*/
export const getUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user._id
    const user = await User.findById(userId)
    const myBlocked = user.blockedChats?.map(id => id.toString()) || []

    // Find all conversations where the user is a participant and the item is not blocked by current user
    const conversations = await Conversation.find({
        participants: userId,
        item: { $nin: myBlocked }
    })

    let unreadConversationsCount = 0

    for (const conv of conversations) {
        // Check if other user blocked this chat
        const otherUserId = conv.participants.find(p => p.toString() !== userId.toString())
        if (otherUserId) {
            const otherUser = await User.findById(otherUserId)
            if (otherUser?.blockedChats?.some(id => id.toString() === conv.item.toString())) {
                continue
            }
        }

        const count = await Message.countDocuments({
            conversation: conv._id,
            receiver: userId,
            status: { $in: ["sent", "delivered"] }
        })
        if (count > 0) {
            unreadConversationsCount++
        }
    }

    return res.status(200).json(
        new ApiResponse(200, { unreadCount: unreadConversationsCount }, "Unread count fetched")
    )
})
