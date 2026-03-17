require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");
const Product = require("../models/Product");

async function debugColorOptions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Fetch all products
    const products = await Product.find({});
    
    console.log(`\nFound ${products.length} products in database\n`);
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
    console.log("\nChecking Product Schema:");
    console.log("Schema paths:", Object.keys(Product.schema.paths));
    console.log("Has colorOptions in schema:", 'colorOptions' in Product.schema.paths);

    await mongoose.connection.close();
    console.log("\nDebug completed");
  } catch (error) {
    console.error("Debug failed:", error);
    process.exit(1);
  }
}

debugColorOptions();
