require("dotenv").config({ path: ".env.production" });
const mongoose = require("mongoose");
const Product = require("../models/Product");

async function addColorOptionsField() {
  try {
    console.log("🔄 Connecting to PRODUCTION database...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to PRODUCTION MongoDB");

    // Find all products that don't have colorOptions field
    const productsWithoutColorOptions = await Product.find({
      colorOptions: { $exists: false },
    });

    console.log(
      `\n📦 Found ${productsWithoutColorOptions.length} products without colorOptions field in PRODUCTION`
    );

    if (productsWithoutColorOptions.length > 0) {
      // Update all products to have an empty colorOptions array
      const result = await Product.updateMany(
        { colorOptions: { $exists: false } },
        { $set: { colorOptions: [] } }
      );

      console.log(`✅ Updated ${result.modifiedCount} products in PRODUCTION`);
    }

    // Verify the update
    const allProducts = await Product.find({});
    console.log("\n📋 All PRODUCTION products now have colorOptions field:");
    allProducts.forEach((product) => {
      console.log(
        `   - ${product.productName}: colorOptions = ${JSON.stringify(product.colorOptions)}`
      );
    });

    await mongoose.connection.close();
    console.log("\n✅ PRODUCTION migration completed successfully");
  } catch (error) {
    console.error("❌ PRODUCTION migration failed:", error);
    process.exit(1);
  }
}

addColorOptionsField();
