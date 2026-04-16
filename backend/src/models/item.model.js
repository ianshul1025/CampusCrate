import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
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
      default: Date.now,
    },
    imageUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: ["Lost", "Found"],
      required: true,
    },
    state: {
      type: String,
      enum: ["active", "claimed", "returned"],
      default: "active",
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    claimQuestion: {
      type: String,
    },
    returnedAt: {
      type: Date,
    },
    tags: [String],
  },
  { timestamps: true }
);

itemSchema.index({ title: "text", description: "text", tags: "text" });

const Item = mongoose.model("Item", itemSchema);

export default Item