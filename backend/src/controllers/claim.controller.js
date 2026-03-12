import Claim from "../models/claim.model.js"
import Item from "../models/item.model.js"

import ApiResponse from "../utils/ApiResponse.js"
import ApiError from "../utils/ApiError.js"
import asyncHandler from "../utils/asyncHandler.js"



/*
Submit claim
*/
export const createClaim = asyncHandler(async (req,res)=>{

    const { itemId } = req.params
    const { answer } = req.body

    const item = await Item.findById(itemId)

    if(!item){
        throw new ApiError(404,"Item not found")
    }

    if(item.owner.toString() === req.user._id.toString()){
        throw new ApiError(400,"You cannot claim your own item")
    }

    const claim = await Claim.create({
        item: itemId,
        claimant: req.user._id,
        answer
    })

    return res.status(201).json(
        new ApiResponse(201,claim,"Claim submitted")
    )

})



/*
Get claims submitted by user
*/
export const getMyClaims = asyncHandler(async(req,res)=>{

    const claims = await Claim.find({ claimant: req.user._id })
        .populate("item")

    return res.status(200).json(
        new ApiResponse(200,claims,"Claims fetched")
    )

})



/*
Verify claim (owner decision)
*/
export const verifyClaim = asyncHandler(async(req,res)=>{

    const { claimId } = req.params
    const { status } = req.body

    const claim = await Claim.findById(claimId).populate("item")

    if(!claim){
        throw new ApiError(404,"Claim not found")
    }

    if(claim.item.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403,"Not authorized")
    }

    claim.status = status
    claim.verifiedBy = req.user._id
    claim.verifiedAt = new Date()

    await claim.save()

    return res.status(200).json(
        new ApiResponse(200,claim,"Claim updated")
    )

})