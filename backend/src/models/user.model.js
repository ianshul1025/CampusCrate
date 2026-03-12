import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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
      enum: ["student", "admin"],
      default: "student",
    },
    clerkId: {
      type: String,
      unique: true,
      sparse: true,
    },
    branch: {
      type: String,
      required: true,
      trim: true,
    },
    batch: {
      type: String,
      required: true,
      trim: true,
    },
    urn: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    avatar: {
      type: String,
    },
    blocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User