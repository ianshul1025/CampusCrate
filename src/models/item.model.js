import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["lost", "found"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    location: {
      type: String,
    },
    date: {
      type: Date,
    },
    photoUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: ["active", "claimed", "returned"],
      default: "active",
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    claimQuestion: {
      type: String,
    },
    tags: [String],
  },
  { timestamps: true }
);

itemSchema.index({ title: "text", description: "text", tags: "text" });

export const Item = mongoose.model("Item", itemSchema);