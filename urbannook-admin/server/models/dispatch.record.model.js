import mongoose from "mongoose";

/**
 * DispatchRecord — tracks the moment an admin physically hands a parcel
 * to the courier for pickup. One record per order (unique on orderId).
 *
 * Designed to grow: handoff photos, courier-received confirmation,
 * parcel-condition notes, etc. can be added without touching other models.
 */
const dispatchRecordSchema = new mongoose.Schema(
  {
    orderId:      { type: String, required: true, unique: true },
    orderType:    { type: String, required: true, enum: ["WEBSITE", "INSTAGRAM"] },
    dispatchedAt: { type: Date,   required: true, default: Date.now },
    dispatchedBy: { type: String, default: null }, // admin email — audit trail
    notes:        { type: String, default: null },
  },
  { timestamps: true },
);

dispatchRecordSchema.index({ dispatchedAt: -1 });
dispatchRecordSchema.index({ orderType: 1, dispatchedAt: -1 });

export default mongoose.model("DispatchRecord", dispatchRecordSchema);
