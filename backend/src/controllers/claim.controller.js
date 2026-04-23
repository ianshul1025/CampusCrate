import Claim from "../models/claim.model.js"
import Item from "../models/item.model.js"
import { Notification } from "../models/notification.model.js"
import User from "../models/user.model.js"
import { Conversation } from "../models/conversation.model.js"

import ApiResponse from "../utils/ApiResponse.js"
import ApiError from "../utils/ApiError.js"
import asyncHandler from "../utils/asyncHandler.js"
import { emitToUser, isUserOnline } from "../socket.js"
import { sendPushToUser } from "../services/webpush.service.js"



/*
Submit claim – POST /claims/:itemId
*/
export const createClaim = asyncHandler(async (req, res) => {

    const { itemId } = req.params
    const { answer } = req.body

    if (!answer || !answer.trim()) {
        throw new ApiError(400, "Claim description is required")
    }

    const item = await Item.findById(itemId).populate("reportedBy", "firstName lastName")

    if (!item) {
        throw new ApiError(404, "Item not found")
    }

    if (item.reportedBy._id.toString() === req.user._id.toString()) {
        throw new ApiError(400, "You cannot claim your own item")
    }

    // Prevent duplicate pending/approved claims
    const existing = await Claim.findOne({
        itemId,
        claimantId: req.user._id,
        status: { $in: ["pending", "approved"] }
    })

    if (existing) {
        throw new ApiError(409, "You already have an active claim for this item")
    }

    // Cooldown check for rejected claims (30 minutes)
    const lastRejected = await Claim.findOne({
        itemId,
        claimantId: req.user._id,
        status: "rejected"
    }).sort({ updatedAt: -1 })

    if (lastRejected) {
        const diffInMs = Date.now() - new Date(lastRejected.updatedAt).getTime()
        const diffInMins = Math.floor(diffInMs / 60000)

        if (diffInMins < 30) {
            throw new ApiError(
                403, 
                `Your previous claim was rejected. Please wait ${30 - diffInMins} more minutes before trying again.`
            )
        }
    }

    const claim = await Claim.create({
        itemId,
        claimantId: req.user._id,
        message: answer
    })

    // Notify item poster via socket + push
    const claimedNotif = await Notification.create({
        recipient: item.reportedBy._id,
        sender: req.user._id,
        type: "ITEM_CLAIMED",
        title: "New claim received",
        message: `Someone submitted a claim for your item: "${item.title}". Review and respond.`,
        item: item._id,
        claim: claim._id
    })
    await claimedNotif.populate("sender", "firstName lastName avatar")
    await claimedNotif.populate("item", "title status imageUrl")
    emitToUser(item.reportedBy._id.toString(), "new_notification", claimedNotif.toObject())

    if (!isUserOnline(item.reportedBy._id.toString())) {
        sendPushToUser(item.reportedBy._id.toString(), {
            title: "New claim received",
            body: `Someone submitted a claim for "${item.title}".`,
            icon: "/icon-192x192.png",
            data: { url: `/item/${item._id}` }
        }).catch(console.error)
    }

    return res.status(201).json(
        new ApiResponse(201, claim, "Claim submitted successfully")
    )

})



/*
Get claims submitted by current user (all items)
*/
export const getMyClaims = asyncHandler(async (req, res) => {

    const claims = await Claim.find({ claimantId: req.user._id })
        .populate("itemId")
        .sort({ createdAt: -1 })

    return res.status(200).json(
        new ApiResponse(200, claims, "Claims fetched")
    )

})



/*
Get current user's claim for a specific item – GET /claims/my-claim/:itemId
*/
export const getMyClaimForItem = asyncHandler(async (req, res) => {

    const { itemId } = req.params

    const claim = await Claim.findOne({
        itemId,
        claimantId: req.user._id
    }).sort({ createdAt: -1 })

    return res.status(200).json(
        new ApiResponse(200, claim || null, "Claim status fetched")
    )

})



/*
Get all claims for a specific item (item owner only) – GET /claims/item/:itemId
*/
export const getClaimsForItem = asyncHandler(async (req, res) => {

    const { itemId } = req.params

    const item = await Item.findById(itemId)

    if (!item) {
        throw new ApiError(404, "Item not found")
    }

    if (item.reportedBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Only the item poster can view claims")
    }

    const claims = await Claim.find({ itemId })
        .populate("claimantId", "firstName lastName avatar branch semester")
        .sort({ createdAt: -1 })

    return res.status(200).json(
        new ApiResponse(200, claims, "Claims fetched")
    )

})



/*
Accept or reject a claim (item owner) – PATCH /claims/:claimId/verify
*/
export const verifyClaim = asyncHandler(async (req, res) => {

    const { claimId } = req.params
    const { status } = req.body

    if (!["approved", "rejected"].includes(status)) {
        throw new ApiError(400, "Status must be 'approved' or 'rejected'")
    }

    const claim = await Claim.findById(claimId).populate("itemId")

    if (!claim) {
        throw new ApiError(404, "Claim not found")
    }

    if (claim.itemId.reportedBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized to review this claim")
    }

    claim.status = status
    await claim.save()

    // If approved, create or find a conversation for this specific item + pair
    if (status === "approved") {
        const posterId = claim.itemId.reportedBy
        const claimantId = claim.claimantId
        
        let conversation = await Conversation.findOne({
            item: claim.itemId._id,
            participants: { $all: [posterId, claimantId] }
        })

        if (!conversation) {
            conversation = await Conversation.create({
                item: claim.itemId._id,
                participants: [posterId, claimantId]
            })
        }
    }

    // Notify the claimant via socket + push
    const notifData = status === "approved"
        ? {
            type: "CLAIM_APPROVED",
            title: "Claim Accepted 🎉",
            message: `Your claim for "${claim.itemId.title}" was accepted. You can now message the poster.`
          }
        : {
            type: "CLAIM_REJECTED",
            title: "Claim Not Accepted",
            message: `Your claim for "${claim.itemId.title}" was not accepted by the poster.`
          }

    const verifyNotif = await Notification.create({
        recipient: claim.claimantId,
        sender: req.user._id,
        ...notifData,
        item: claim.itemId._id,
        claim: claim._id
    })
    await verifyNotif.populate("sender", "firstName lastName avatar")
    await verifyNotif.populate("item", "title status imageUrl")
    emitToUser(claim.claimantId.toString(), "new_notification", verifyNotif.toObject())

    if (!isUserOnline(claim.claimantId.toString())) {
        sendPushToUser(claim.claimantId.toString(), {
            title: notifData.title,
            body: notifData.message,
            icon: "/icon-192x192.png",
            data: { url: `/item/${claim.itemId._id}` }
        }).catch(console.error)
    }

    return res.status(200).json(
        new ApiResponse(200, claim, `Claim ${status}`)
    )

})