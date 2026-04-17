import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import AdminCredential from "../models/adminCredential.model.js";

const ADMIN_UID = process.env.ADMIN_UID;
const ADMIN_PWD = process.env.ADMIN_PWD;

export const adminLogin = asyncHandler(async (req, res) => {
  const { adminId, password } = req.body;

  if (!adminId || !password) {
    throw new ApiError(400, "Admin ID and Password are required");
  }

  let isValid = false;
  const hasManagedCredential = await AdminCredential.exists({});
  const storedCredential = await AdminCredential.findOne({ adminId });

  // After first credential change, allow login ONLY via managed DB credentials.
  if (hasManagedCredential) {
    if (storedCredential) {
      isValid = await bcrypt.compare(password, storedCredential.passwordHash);
    } else {
      isValid = false;
    }
  } else if (storedCredential) {
    isValid = await bcrypt.compare(password, storedCredential.passwordHash);
  } else {
    isValid = adminId === ADMIN_UID && password === ADMIN_PWD;
  }

  if (!isValid) {
    throw new ApiError(401, "Invalid Admin Credentials");
  }

  const token = jwt.sign(
    { _id: "superadmin", role: "admin", adminId },
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

export const changeAdminPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword, newAdminId } = req.body;
  const adminId = req.user?.adminId || ADMIN_UID;
  const normalizedNewAdminId = (newAdminId || "").trim();
  const effectiveAdminId = normalizedNewAdminId || adminId;

  if (!oldPassword || !newPassword || !confirmPassword) {
    throw new ApiError(400, "Old password, new password, and confirmation are required");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "New password and confirm password do not match");
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, "New password must be at least 8 characters");
  }

  const storedCredential = await AdminCredential.findOne({ adminId });
  let oldPasswordValid = false;

  if (storedCredential) {
    oldPasswordValid = await bcrypt.compare(oldPassword, storedCredential.passwordHash);
  } else if (adminId === ADMIN_UID) {
    oldPasswordValid = oldPassword === ADMIN_PWD;
  }

  if (!oldPasswordValid) {
    throw new ApiError(401, "Old password is incorrect");
  }

  if (oldPassword === newPassword) {
    throw new ApiError(400, "New password must be different from old password");
  }

  // Single-admin system: allow reusing any admin ID freely.
  // If another stale credential row has the target ID, remove it and continue.
  if (effectiveAdminId !== adminId) {
    await AdminCredential.deleteMany({ adminId: effectiveAdminId });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await AdminCredential.findOneAndUpdate(
    { adminId },
    { $set: { adminId: effectiveAdminId, passwordHash } },
    { upsert: true, new: true }
  );

  const refreshedToken = jwt.sign(
    { _id: "superadmin", role: "admin", adminId: effectiveAdminId },
    process.env.JWT_SECRET || "fallback_secret",
    { expiresIn: "1d" }
  );

  res.cookie("adminToken", refreshedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { adminId: effectiveAdminId, token: refreshedToken },
      "Admin credentials updated successfully"
    )
  );
});
