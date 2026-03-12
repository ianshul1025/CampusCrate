import Item from "../models/item.model.js"
import ApiResponse from "../utils/ApiResponse.js"
import ApiError from "../utils/ApiError.js"
import asyncHandler from "../utils/asyncHandler.js"



/*
Create Lost or Found Item
*/
export const createItem = asyncHandler(async (req, res) => {

  const {
    title,
    description,
    category,
    tags,
    location,
    type,
    date,
    claimQuestion,
    photoUrl
  } = req.body

  if (!title || !description || !category || !location || !type) {
    throw new ApiError(400, "Required fields missing")
  }

  const item = await Item.create({
    title,
    description,
    category,
    tags,
    location,
    type,
    date,
    claimQuestion,
    photoUrl,
    postedBy: req.user._id
  })

  return res.status(201).json(
    new ApiResponse(201, item, "Item posted successfully")
  )
})



/*
Get All Items (with search & filters)
*/
export const getItems = asyncHandler(async (req, res) => {

  const { keyword, category, location, status } = req.query

  let filter = {}

  if (category) filter.category = category
  if (location) filter.location = location
  if (status) filter.status = status

  if (keyword) {
    filter.$text = { $search: keyword }
  }

  const items = await Item.find(filter)
    .populate("owner", "name email")
    .sort({ createdAt: -1 })

  return res.status(200).json(
    new ApiResponse(200, items, "Items fetched successfully")
  )
})



/*
Get Single Item
*/
export const getItemById = asyncHandler(async (req, res) => {

  const item = await Item.findById(req.params.id)
    .populate("owner", "name email")

  if (!item) {
    throw new ApiError(404, "Item not found")
  }

  return res.status(200).json(
    new ApiResponse(200, item, "Item fetched")
  )
})



/*
Update Item
*/
export const updateItem = asyncHandler(async (req, res) => {

  const item = await Item.findById(req.params.id)

  if (!item) {
    throw new ApiError(404, "Item not found")
  }

  if (item.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized")
  }

  Object.assign(item, req.body)

  await item.save()

  return res.status(200).json(
    new ApiResponse(200, item, "Item updated")
  )
})



/*
Delete Item
*/
export const deleteItem = asyncHandler(async (req, res) => {

  const item = await Item.findById(req.params.id)

  if (!item) {
    throw new ApiError(404, "Item not found")
  }

  if (item.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized")
  }

  await item.deleteOne()

  return res.status(200).json(
    new ApiResponse(200, null, "Item deleted")
  )
})



/*
Mark Item Returned
*/
export const markReturned = asyncHandler(async (req, res) => {

  const item = await Item.findById(req.params.id)

  if (!item) {
    throw new ApiError(404, "Item not found")
  }

  if (item.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized")
  }

  item.status = "returned"

  await item.save()

  return res.status(200).json(
    new ApiResponse(200, item, "Item marked as returned")
  )
})