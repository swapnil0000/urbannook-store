const mongoose = require("mongoose");

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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
