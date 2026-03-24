import mongoose from "mongoose";
const instagramOrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true },
    customerName: { type: String, required: true },
    contactNumber: { type: String, required: true },
    deliveryAddress: { type: String, required: true },
    notes: { type: String },
    items: [
      {
        productId: { type: String },
        productSnapshot: {
          productName: { type: String },
          productImg: { type: String },
          quantity: { type: Number },
          productCategory: { type: String },
          productSubCategory: { type: String },
          priceAtPurchase: { type: Number },
          isCustomPrice: { type: Boolean, default: false },
        },
      },
    ],
    amount: { type: Number },
    status: {
      type: String,
      enum: ["CREATED", "PAID", "FAILED"],
      default: "CREATED",
    },
    orderedAt: { type: Date }, // admin-entered order date (when customer actually placed it)
    trackingInfo: {
      carrier:        { type: String },
      trackingNumber: { type: String },
      updatedAt:      { type: Date },
    },
  },
  { timestamps: true },
);

// Mirror the same indexes as the website Order model for identical query performance
instagramOrderSchema.index({ createdAt: -1 });
instagramOrderSchema.index({ status: 1 });
instagramOrderSchema.index({ createdAt: -1, status: 1 });

export default mongoose.model("InstagramOrder", instagramOrderSchema);
