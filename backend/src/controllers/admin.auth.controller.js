import jwt from "jsonwebtoken";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const ADMIN_UID = process.env.ADMIN_UID;
const ADMIN_PWD = process.env.ADMIN_PWD;

export const adminLogin = asyncHandler(async (req, res) => {
  const { adminId, password } = req.body;

  if (!adminId || !password) {
    throw new ApiError(400, "Admin ID and Password are required");
  }

  if (adminId !== ADMIN_UID || password !== ADMIN_PWD) {
    throw new ApiError(401, "Invalid Admin Credentials");
  }

  const token = jwt.sign(
    { _id: "superadmin", role: "admin" },
    process.env.JWT_SECRET || "fallback_secret",
    { expiresIn: "1d" }
  );

  res.cookie("adminToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000,
  });

  return res.status(200).json(
    new ApiResponse(200, {
      admin: { _id: "superadmin", firstName: "System", lastName: "Administrator", role: "admin" },
      token,
    }, "Admin authenticated successfully")
  );
});

export const adminLogout = asyncHandler(async (req, res) => {
  res.clearCookie("adminToken");
  return res.status(200).json(new ApiResponse(200, null, "Admin logged out"));
});
