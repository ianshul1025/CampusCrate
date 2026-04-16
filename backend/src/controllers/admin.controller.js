import Item from "../models/item.model.js";
import User from "../models/user.model.js";
import Claim from "../models/claim.model.js";
import { UserReport } from "../models/userReport.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getAnalytics = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalItems,
    lostItems,
    foundItems,
    returnedItems,
    pendingClaims,
    acceptedClaims,
    rejectedClaims,
    blockedUsers,
    pendingReports,
  ] = await Promise.all([
    User.countDocuments(),
    Item.countDocuments(),
    Item.countDocuments({ status: "Lost" }),
    Item.countDocuments({ status: "Found" }),
    Item.countDocuments({ state: "returned" }),
    Claim.countDocuments({ status: "pending" }),
    Claim.countDocuments({ status: "approved" }),
    Claim.countDocuments({ status: "rejected" }),
    User.countDocuments({ blocked: true }),
    UserReport.countDocuments({ status: "pending" }),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      totalUsers, totalItems, lostItems, foundItems, returnedItems,
      pendingClaims, acceptedClaims, rejectedClaims, blockedUsers, pendingReports,
    }, "Analytics fetched successfully")
  );
});

export const getAllItemsAdmin = asyncHandler(async (req, res) => {
  const items = await Item.find({})
    .populate("reportedBy", "firstName lastName email blocked avatar")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, items, "All items fetched for moderation")
  );
});

export const deleteAnyItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await Item.findById(id);
  if (!item) throw new ApiError(404, "Item not found");

  await item.deleteOne();
  return res.status(200).json(
    new ApiResponse(200, null, "Item permanently deleted by Admin")
  );
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}, "-blockedUsers -blockedChats -savedItems")
    .sort({ firstName: 1 });

  return res.status(200).json(
    new ApiResponse(200, users, "Users fetched successfully")
  );
});

export const toggleBlockUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  user.blocked = !user.blocked;
  user.blockedAt = user.blocked ? new Date() : null;
  await user.save();

  // If the user was just blocked, formally 'Resolve' (review) any pending reports against them
  if (user.blocked) {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await UserReport.updateMany(
      { reportedUser: userId, status: "pending" },
      { $set: { status: "reviewed", expiresAt: thirtyDaysFromNow } }
    );
  }

  return res.status(200).json(
    new ApiResponse(200, user, `User ${user.blocked ? "blocked" : "unblocked"} successfully`)
  );
});

/*
  Get All User Complaints / Reports
*/
export const getAllReports = asyncHandler(async (req, res) => {
  const reports = await UserReport.find({})
    .populate("reportedBy", "firstName lastName email avatar")
    .populate("reportedUser", "firstName lastName email avatar blocked")
    .populate("item", "title category")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, reports, "Reports fetched successfully")
  );
});

/*
  Update Report Status
*/
export const updateReportStatus = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { status } = req.body;

  if (!["pending", "reviewed", "dismissed"].includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  let updateFields = { status };
  
  if (status === "reviewed" || status === "dismissed") {
    // Expire 30 days after resolution
    updateFields.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  } else {
    // If somehow moved back to pending, remove expiry
    updateFields.expiresAt = null;
  }

  const report = await UserReport.findByIdAndUpdate(
    reportId,
    updateFields,
    { new: true }
  );

  if (!report) throw new ApiError(404, "Report not found");

  return res.status(200).json(
    new ApiResponse(200, report, `Report marked as ${status}`)
  );
});
