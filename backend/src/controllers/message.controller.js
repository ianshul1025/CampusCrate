import Message from "../models/message.model.js"
import Item from "../models/item.model.js"
import Claim from "../models/claim.model.js"

import ApiResponse from "../utils/ApiResponse.js"
import ApiError from "../utils/ApiError.js"
import asyncHandler from "../utils/asyncHandler.js"



/*
Send Message
*/
export const sendMessage = asyncHandler(async (req,res)=>{

    const { itemId } = req.params
    const { message } = req.body

    const item = await Item.findById(itemId)

    if(!item){
        throw new ApiError(404,"Item not found")
    }

    const claim = await Claim.findOne({
        item:itemId,
        status:"approved"
    })

    if(!claim){
        throw new ApiError(403,"Chat not available until claim approved")
    }

    let receiver

    if(req.user._id.toString() === item.owner.toString()){
        receiver = claim.claimant
    } else {
        receiver = item.owner
    }

    const newMessage = await Message.create({
        item:itemId,
        sender:req.user._id,
        receiver,
        message
    })

    return res.status(201).json(
        new ApiResponse(201,newMessage,"Message sent")
    )

})



/*
Get chat messages
*/
export const getItemMessages = asyncHandler(async (req,res)=>{

    const { itemId } = req.params

    const messages = await Message.find({ item:itemId })
        .populate("sender","name avatar")
        .sort({createdAt:1})

    return res.status(200).json(
        new ApiResponse(200,messages,"Messages fetched")
    )

})