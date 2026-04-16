import Claim from "../models/claim.model.js"
import Item from "../models/item.model.js"
import { Notification } from "../models/notification.model.js"

import ApiResponse from "../utils/ApiResponse.js"
import ApiError from "../utils/ApiError.js"
import asyncHandler from "../utils/asyncHandler.js"



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

    // Notify item poster
    await Notification.create({
        recipient: item.reportedBy._id,
        sender: req.user._id,
        type: "ITEM_CLAIMED",
        title: "New claim received",
        message: `Someone submitted a claim for your item: "${item.title}". Review and respond.`,
        item: item._id,
        claim: claim._id
    })

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

    // Notify the claimant
    if (status === "approved") {
        await Notification.create({
            recipient: claim.claimantId,
            sender: req.user._id,
            type: "CLAIM_APPROVED",
            title: "Claim Accepted 🎉",
            message: `Your claim for "${claim.itemId.title}" was accepted. You can now message the poster.`,
            item: claim.itemId._id,
            claim: claim._id
        })
    } else {
        await Notification.create({
            recipient: claim.claimantId,
            sender: req.user._id,
            type: "CLAIM_REJECTED",
            title: "Claim Not Accepted",
            message: `Your claim for "${claim.itemId.title}" was not accepted by the poster.`,
            item: claim.itemId._id,
            claim: claim._id
        })
    }

    return res.status(200).json(
        new ApiResponse(200, claim, `Claim ${status}`)
    )

})