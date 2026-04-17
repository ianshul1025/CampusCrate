import jwt from "jsonwebtoken"
import ApiError from "../utils/ApiError.js"
import asyncHandler from "../utils/asyncHandler.js"
import User from "../models/user.model.js"
const ADMIN_UID = process.env.ADMIN_UID;

export const verifyAdmin = asyncHandler(async (req, res, next) => {
  // Accept token from Bearer header OR cookie
  let token = req.cookies?.adminToken;
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new ApiError(401, "Admin access required, no token found")
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret")

    if (decoded.role !== "admin") {
      throw new ApiError(403, "Admin access required")
    }

    // Superadmin bypass (hardcoded credential flow)
    if (decoded._id === "superadmin") {
      req.user = {
        _id: "superadmin",
        role: "admin",
        firstName: "Super",
        lastName: "Admin",
        adminId: decoded.adminId || ADMIN_UID,
      };
      return next();
    }

    const user = await User.findById(decoded._id)
    if (!user || user.role !== "admin") {
      throw new ApiError(403, "Invalid admin session")
    }

    req.user = user
    next()

  } catch (error) {
    throw new ApiError(401, "Invalid or expired admin token")
  }
})