import mongoose from "mongoose"

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    type: {
      type: String,
      enum: [
        "ITEM_MATCH",
        "ITEM_CLAIMED",
        "CLAIM_APPROVED",
        "CLAIM_REJECTED",
        "NEW_MESSAGE",
        "ITEM_RETURNED",
        "ADMIN_WARNING",
        "CHAT_BLOCKED",
        "CHAT_UNBLOCKED",
        "ITEM_EXPIRED"
      ],
      required: true
    },

    title: {
      type: String,
      required: true
    },

    message: {
      type: String,
      required: true
    },

    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item"
    },

    claim: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Claim"
    },

    isRead: {
      type: Boolean,
      default: false
    },

    readAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
)

notificationSchema.index({ recipient: 1, createdAt: -1 })

export const Notification = mongoose.model("Notification", notificationSchema)