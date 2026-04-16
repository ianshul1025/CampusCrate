import Item from "../models/item.model.js"
import Stat from "../models/stat.model.js"
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
    status, // "Lost" or "Found"
    date,
    claimQuestion,
    imageUrl
  } = req.body

  if (!title || !description || !category || !status) {
    throw new ApiError(400, "Required fields missing")
  }

  const item = await Item.create({
    title,
    description,
    category,
    tags,
    location,
    status,
    date,
    claimQuestion,
    imageUrl,
    reportedBy: req.user._id
  })

  return res.status(201).json(
    new ApiResponse(201, item, "Item posted successfully")
  )
})

/*
Get All Items (with search & filters)
*/
export const getItems = asyncHandler(async (req, res) => {
  const { keyword, category, location, status, state } = req.query

  let filter = {}

  if (category) filter.category = category
  if (location) filter.location = location
  if (status) filter.status = status

  // Hide returned items older than 12 hours from the feed
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000)

  if (state) {
    filter.state = state
  } else {
    filter.$or = [
      { state: { $ne: "returned" } },
      { state: "returned", returnedAt: { $gte: twelveHoursAgo } },
      { state: "returned", returnedAt: { $exists: false } }
    ]
  }

  if (keyword) {
    filter.$text = { $search: keyword }
  }

  let items = await Item.find(filter)
    .populate("reportedBy", "firstName lastName email blocked")
    .sort({ createdAt: -1 })

  // Hide items from blocked users in public feed
  items = items.filter(item => !item.reportedBy?.blocked)

  return res.status(200).json(
    new ApiResponse(200, items, "Items fetched successfully")
  )
})

/*
Get Single Item
*/
export const getItemById = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id)
    .populate("reportedBy", "firstName lastName email avatar")

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

  if (item.reportedBy.toString() !== req.user._id.toString()) {
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

  if (item.reportedBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
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

  if (item.reportedBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized")
  }

  item.state = "returned"
  item.returnedAt = new Date()

  await item.save()

  // Increment the persistent global stat
  await Stat.findOneAndUpdate(
    { type: "global" },
    { $inc: { totalReturnedItems: 1 } },
    { upsert: true, new: true }
  )

  return res.status(200).json(
    new ApiResponse(200, item, "Item marked as returned")
  )
})

/*
Get Global Statistics
*/
export const getGlobalStats = asyncHandler(async (req, res) => {
  let stats = await Stat.findOne({ type: "global" })

  // Count baseline historical items
  const actualDBCount = await Item.countDocuments({ state: "returned" })

  if (!stats) {
    stats = await Stat.create({ type: "global", totalReturnedItems: actualDBCount })
  } else if (stats.totalReturnedItems < actualDBCount) {
    // Retroactively sync if somehow the counter trailed behind actual DB numbers
    stats.totalReturnedItems = actualDBCount
    await stats.save()
  }

  return res.status(200).json(
    new ApiResponse(200, stats, "Global stats fetched")
  )
})

/*
Toggle Save Item
*/
export const toggleSaveItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  if (!user.savedItems) user.savedItems = [];

  const isSaved = user.savedItems.includes(id);

  if (isSaved) {
    // Unsave it
    user.savedItems = user.savedItems.filter(itemId => itemId.toString() !== id);
  } else {
    // Save it
    user.savedItems.push(id);
  }

  await user.save();

  return res.status(200).json(
    new ApiResponse(200, user.savedItems, isSaved ? "Item removed from saved collection" : "Item saved to collection")
  );
});

/*
Get Saved Items
*/
export const getSavedItems = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user.savedItems || user.savedItems.length === 0) {
    return res.status(200).json(new ApiResponse(200, [], "No saved items"));
  }

  const items = await Item.find({ _id: { $in: user.savedItems } }).sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, items, "Fetched saved items successfully")
  );
});