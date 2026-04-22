import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    firstName: {
      type: String,
      trim: true,
    },
    middleName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Prefer not to say"],
    },
    course: {
      type: String,
      trim: true,
    },
    branch: {
      type: String,
      trim: true,
    },
    batchYear: {
      type: String,
      trim: true,
    },
    semester: {
      type: String,
      trim: true,
    },
    urn: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
    },
    blocked: {
      type: Boolean,
      default: false,
    },
    blockedAt: {
      type: Date,
    },
    savedItems: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
    }],
    blockedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    blockedChats: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
    }],
    // Web Push subscriptions — one per device/browser
    pushSubscriptions: [{
      endpoint: { type: String, required: true },
      keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true }
      }
    }],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User