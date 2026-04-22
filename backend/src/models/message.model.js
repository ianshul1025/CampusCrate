import mongoose from "mongoose"

const messageSchema = new mongoose.Schema(
{
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true
    },
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
        required: true
    },

    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    message: {
        type: String,
        required: true
    },

    // Legacy boolean kept for backward compat (derived from status)
    read: {
        type: Boolean,
        default: false
    },

    // Production-grade message lifecycle: sent → delivered → read
    status: {
        type: String,
        enum: ["sent", "delivered", "read"],
        default: "sent"
    }

},
{ timestamps: true }
)

// Index for fast unread queries
messageSchema.index({ item: 1, receiver: 1, status: 1 })
messageSchema.index({ item: 1, createdAt: 1 })

const Message = mongoose.model("Message", messageSchema)

export default Message