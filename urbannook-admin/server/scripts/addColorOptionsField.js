require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");
const Product = require("../models/Product");

async function addColorOptionsField() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find all products that don't have colorOptions field
    const productsWithoutColorOptions = await Product.find({
      colorOptions: { $exists: false },
    });

    console.log(
      `Found ${productsWithoutColorOptions.length} products without colorOptions field`
    );

    if (productsWithoutColorOptions.length > 0) {
      // Update all products to have an empty colorOptions array
      const result = await Product.updateMany(
        { colorOptions: { $exists: false } },
        { $set: { colorOptions: [] } }
      );

      console.log(`Updated ${result.modifiedCount} products`);
    }

    // Verify the update
    const allProducts = await Product.find({});
    console.log("\nAll products now have colorOptions field:");
    allProducts.forEach((product) => {
      console.log(
        `- ${product.productName}: colorOptions = ${JSON.stringify(product.colorOptions)}`
      );
    });

    await mongoose.connection.close();
    console.log("\nMigration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

addColorOptionsField();
