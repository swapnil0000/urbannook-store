const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    couponCodeId: {
      type: String,
      required: true,
      unique: true,
    },
    discountType: {
      type: String,
      required: true,
      enum: ["PERCENTAGE", "FLAT"],
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      min: 0,
    },
    minCartValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    desc: {
      type: String,
      maxlength: 200,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);
