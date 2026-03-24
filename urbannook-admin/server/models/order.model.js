import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: { type: String },
    orderId: { type: String, unique: true },
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
        },
      },
    ],
    amount: { type: Number },
    deliveryAddress: {
      addressId: { type: String },
      formattedAddress: { type: String },
      lat: { type: Number },
      long: { type: Number },
    },
    payment: {
      razorpayOrderId: { type: String },
      razorpayPaymentId: { type: String },
      razorpaySignature: { type: String },
    },
    status: { type: String, enum: ["CREATED", "PAID", "FAILED"] },
    fulfillmentStatus: {
      type: String,
      enum: ["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"],
      default: "PROCESSING",
    },
    trackingInfo: {
      carrier:        { type: String },
      trackingNumber: { type: String },
      updatedAt:      { type: Date },
    },
  },
  { timestamps: true },
);

// Indexes for high-performance filtered + sorted queries
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1, status: 1 });

export default mongoose.model("Order", orderSchema);
