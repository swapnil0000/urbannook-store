const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true, unique: true },
    productId: { type: String, required: true, unique: true },
    uiProductId: { type: String, required: true, unique: true },
    productImg: { type: String, required: true, unique: true },
    secondaryImages: [{ type: String }],
    productDes: { type: String, required: true },
    sellingPrice: { type: Number, required: true, min: 10 },
    productCategory: { type: String, required: true },
    productQuantity: { type: Number, default: 0 },
    dimensions: {
      length: { type: Number },
      breadth: { type: Number },
      height: { type: Number },
    },
    productStatus: {
      type: String,
      enum: ["in_stock", "out_of_stock", "discontinued"],
    },
    tags: [
      {
        type: String,
        enum: ["featured", "new_arrival", "best_seller", "trending"],
      },
    ],
    isPublished: { type: Boolean, default: false },
    productSubDes: { type: String },
    productSubCategory: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
