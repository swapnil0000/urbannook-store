import mongoose from "mongoose";

const instagramOrderSchema = new mongoose.Schema(
  {
    orderId:            { type: String, unique: true },
    customerName:       { type: String, required: true },
    productName:        { type: String }, // for quick-link orders
    contactNumber:      { type: String },
    deliveryAddress:    { type: String },
    email:              { type: String },
    notes:              { type: String },
    items: [
      {
        productId: { type: String },
        productSnapshot: {
          productName:        { type: String },
          productImg:         { type: String },
          quantity:           { type: Number },
          productCategory:    { type: String },
          productSubCategory: { type: String },
          priceAtPurchase: { type: Number },
          isCustomPrice: { type: Boolean, default: false },
        },
      },
    ],
    amount: { type: Number },
    isPriority:    { type: Boolean, default: false },
    prioritizedAt: { type: Date,    default: null },
    status: {
      type:    String,
      enum:    ["CREATED", "PAID", "FAILED"],
      default: "CREATED",
    },
    orderedAt: { type: Date }, // admin-entered order date (when customer actually placed it)
    trackingInfo: {
      carrier:        { type: String },
      trackingNumber: { type: String },
      updatedAt:      { type: Date },
    },

    // Razorpay fields
    razorpayOrderId:   { type: String }, // set when customer initiates payment
    razorpayPaymentId: { type: String }, // set after successful payment
  },
  { timestamps: true },
);

instagramOrderSchema.index({ createdAt: -1 });
instagramOrderSchema.index({ status: 1 });
instagramOrderSchema.index({ createdAt: -1, status: 1 });

export default mongoose.model("InstagramOrder", instagramOrderSchema);
