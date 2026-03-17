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
    listedPrice: { type: Number, required: true, min: 10 },
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
    materialAndCare: { type: String },
    colorOptions: [{ type: String }],
    specifications: [
      {
        key: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
  },
  { 
    timestamps: true,
    strict: true,
    strictQuery: false
  }
);

productSchema.index({ productCategory: 1 });
productSchema.index({ productStatus: 1 });
productSchema.index({ productCategory: 1, productStatus: 1 });
productSchema.index({ productName: "text", productDes: "text" });
productSchema.index({ tags: 1 });
productSchema.index({ isPublished: 1 });

module.exports = mongoose.model("Product", productSchema);
