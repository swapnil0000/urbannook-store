require("dotenv").config();
const mongoose = require("mongoose");

// Product Schema
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
    specifications: [
      {
        key: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

async function mergeProducts() {
  try {
    console.log("=== Merging products: DEV → PRODUCTION ===\n");

    const DEV_CLUSTER = 'mongodb+srv://urbannookdevcluster:VbQ1N61G2ZRBSd7o@urbannook-dev-cluster.pejh8ds.mongodb.net';
    const DEV_DB = 'un_dev';
    const PROD_CLUSTER = 'mongodb+srv://admin:Ma8RJG2cdM5I4xYo@urbanookcluster.jbb5ia2.mongodb.net';
    const PROD_DB = 'un';

    // Connect to both databases
    const devConn = await mongoose.createConnection(DEV_CLUSTER, { dbName: DEV_DB });
    console.log("✓ Connected to DEV");

    const prodConn = await mongoose.createConnection(PROD_CLUSTER, { dbName: PROD_DB });
    console.log("✓ Connected to PRODUCTION\n");

    const DevProduct = devConn.model("Product", productSchema);
    const ProdProduct = prodConn.model("Product", productSchema);

    // Get all products from both databases
    const devProducts = await DevProduct.find({});
    const prodProducts = await ProdProduct.find({});

    console.log(`DEV has ${devProducts.length} products`);
    console.log(`PRODUCTION has ${prodProducts.length} products\n`);

    // Create a map of existing production product IDs
    const prodProductIds = new Set(prodProducts.map(p => p.productId));

    console.log("=== Existing products in PRODUCTION ===");
    prodProducts.forEach(p => {
      console.log(`  - ${p.productName} (${p.uiProductId})`);
    });

    console.log("\n=== Processing DEV products ===");
    let addedCount = 0;
    let skippedCount = 0;

    for (const devProduct of devProducts) {
      if (prodProductIds.has(devProduct.productId)) {
        console.log(`⊘ SKIP: ${devProduct.productName} (${devProduct.uiProductId}) - already exists`);
        skippedCount++;
      } else {
        try {
          const productData = devProduct.toObject();
          delete productData._id;
          
          await ProdProduct.create(productData);
          console.log(`✓ ADD: ${devProduct.productName} (${devProduct.uiProductId})`);
          addedCount++;
        } catch (error) {
          console.log(`✗ FAIL: ${devProduct.productName} - ${error.message}`);
        }
      }
    }

    await devConn.close();
    await prodConn.close();

    console.log("\n=== Merge Summary ===");
    console.log(`Products in DEV: ${devProducts.length}`);
    console.log(`Products in PROD before: ${prodProducts.length}`);
    console.log(`Products added: ${addedCount}`);
    console.log(`Products skipped (already exist): ${skippedCount}`);
    console.log(`Products in PROD after: ${prodProducts.length + addedCount}`);
    console.log("\n✓ Merge completed");

    process.exit(0);
  } catch (error) {
    console.error("✗ Merge failed:", error.message);
    process.exit(1);
  }
}

mergeProducts();
