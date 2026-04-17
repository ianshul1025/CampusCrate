import mongoose from "mongoose";

const adminCredentialSchema = new mongoose.Schema(
  {
    adminId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const AdminCredential = mongoose.model("AdminCredential", adminCredentialSchema);

export default AdminCredential;
