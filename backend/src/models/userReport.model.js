import mongoose from "mongoose";

const userReportSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
    },
    reason: {
      type: String,
      enum: ["scam", "fraud", "irrelevant", "harassment", "spam", "other"],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // New fields for Chat Reporting
    chatId: { type: String },
    itemName: { type: String },
    reportedUserName: { type: String },
    reporterName: { type: String },
    lastFiveMessages: [
      {
        senderId: String,
        senderName: String,
        senderAvatar: String,
        message: String,
        createdAt: Date,
      }
    ],
    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed"],
      default: "pending",
    },
    expiresAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// TTL index to automatically delete documents when the expiresAt time is reached.
userReportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const UserReport = mongoose.model("UserReport", userReportSchema);
