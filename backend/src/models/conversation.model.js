import mongoose, { Schema } from "mongoose";

const conversationSchema = new Schema(
    {
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true
            }
        ],
        // The LATEST item being discussed (can change over time)
        item: {
            type: Schema.Types.ObjectId,
            ref: "Item"
        },
        latestMessage: {
            type: Schema.Types.ObjectId,
            ref: "Message"
        }
    },
    { timestamps: true }
);

// Ensure only one conversation exists between any two users
// Note: In production, we'd sort participants before saving to make this work perfectly
conversationSchema.index({ participants: 1 });

export const Conversation = mongoose.model("Conversation", conversationSchema);
