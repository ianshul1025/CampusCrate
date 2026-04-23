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

// Ensure a unique conversation exists for each item and pair of participants
conversationSchema.index({ item: 1, participants: 1 }, { unique: true });

export const Conversation = mongoose.model("Conversation", conversationSchema);
