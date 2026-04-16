import mongoose from "mongoose";

const statSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      default: "global",
      unique: true, // ensures only one global stat document exists
    },
    totalReturnedItems: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Stat = mongoose.model("Stat", statSchema);

export default Stat;
