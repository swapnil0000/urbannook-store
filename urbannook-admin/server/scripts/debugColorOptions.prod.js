require("dotenv").config({ path: ".env.production" });
const mongoose = require("mongoose");
const Product = require("../models/Product");

async function debugColorOptions() {
  try {
    console.log("🔄 Connecting to PRODUCTION database...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to PRODUCTION MongoDB");

    // Fetch all products
    const products = await Product.find({});
    
    console.log(`\n📦 Found ${products.length} products in PRODUCTION database\n`);
    console.log("=" .repeat(80));

    products.forEach((product, index) => {
      console.log(`\n${index + 1}. Product: ${product.productName}`);
      console.log(`   Product ID: ${product.productId}`);
      console.log(`   UI Product ID: ${product.uiProductId}`);
      console.log(`   Has colorOptions field: ${product.colorOptions !== undefined}`);
      console.log(`   colorOptions value: ${JSON.stringify(product.colorOptions)}`);
      console.log(`   colorOptions type: ${typeof product.colorOptions}`);
      console.log(`   colorOptions is array: ${Array.isArray(product.colorOptions)}`);
      
      // Check the raw document
      const rawDoc = product.toObject();
      console.log(`   Raw document has colorOptions: ${'colorOptions' in rawDoc}`);
      console.log(`   Raw colorOptions: ${JSON.stringify(rawDoc.colorOptions)}`);
    });

    console.log("\n" + "=".repeat(80));
    console.log("\n📊 Summary:");
    const withColors = products.filter(p => p.colorOptions && p.colorOptions.length > 0);
    const withoutColors = products.filter(p => !p.colorOptions || p.colorOptions.length === 0);
    console.log(`   Products with colors: ${withColors.length}`);
    console.log(`   Products without colors: ${withoutColors.length}`);

    await mongoose.connection.close();
    console.log("\n✅ PRODUCTION debug completed");
  } catch (error) {
    console.error("❌ PRODUCTION debug failed:", error);
    process.exit(1);
  }
}

debugColorOptions();
