import mongoose from "mongoose";

// Read-only model — maps to existing 'carts' collection in prod DB
// Schema is kept flexible (strict: false) so any extra fields pass through
const cartSchema = new mongoose.Schema(
  {
    userId: { type: String },
    products: { type: mongoose.Schema.Types.Mixed },
    appliedCoupon: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true, strict: false, collection: "carts" }
);

cartSchema.index({ updatedAt: -1 });

export default mongoose.model("Cart", cartSchema);
