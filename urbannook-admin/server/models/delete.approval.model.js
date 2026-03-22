import mongoose from "mongoose";

const deleteApprovalSchema = new mongoose.Schema(
  {
    resource: { type: String, required: true },          // e.g. "products"
    resourceId: { type: String, required: true },        // productId
    resourceName: { type: String, required: true },      // human-readable name
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvals: [
      {
        adminUid: { type: String, required: true },
        email: { type: String, required: true },
        approvedAt: { type: Date, default: Date.now },
      },
    ],
    rejectedBy: {
      adminUid: String,
      email: String,
      rejectedAt: Date,
    },
    initiatedBy: {
      adminUid: { type: String, required: true },
      email: { type: String, required: true },
    },
    requiredApprovals: { type: Number, default: 2 },
    executedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("DeleteApproval", deleteApprovalSchema);
