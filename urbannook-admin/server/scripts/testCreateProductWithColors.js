require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");
const { uuidv7 } = require("uuidv7");
const Product = require("../models/Product");
const Counter = require("../models/Counter");

async function testCreateProduct() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const productId = uuidv7();
    
    // Get next UI product ID
    const counter = await Counter.findByIdAndUpdate(
      "uiProductId",
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true }
    );
    const uiProductId = `UN-PROD-${counter.sequence_value}`;

    const testProductData = {
      productName: `Test Product with Colors ${Date.now()}`,
      productId,
      uiProductId,
      productImg: `https://example.com/test-${Date.now()}.jpg`,
      productDes: "This is a test product to verify colorOptions are saved",
      sellingPrice: 100,
      listedPrice: 118,
      productCategory: "Test Category",
      productQuantity: 50,
      productStatus: "in_stock",
      tags: ["featured"],
      isPublished: true,
      colorOptions: ["Red", "Blue", "Green", "Yellow"],
      specifications: [
        { key: "Material", value: "Test Material" },
        { key: "Weight", value: "100g" }
      ]
    };

    console.log("\nCreating product with data:");
    console.log(JSON.stringify(testProductData, null, 2));

    const product = await Product.create(testProductData);

    console.log("\n✅ Product created successfully!");
    console.log("Product ID:", product.productId);
    console.log("UI Product ID:", product.uiProductId);

    // Fetch it back from database to verify
    const fetchedProduct = await Product.findOne({ productId: product.productId });
    
    console.log("\n📦 Fetched product from database:");
    console.log("Product Name:", fetchedProduct.productName);
    console.log("Color Options:", JSON.stringify(fetchedProduct.colorOptions));
    console.log("Specifications:", JSON.stringify(fetchedProduct.specifications));

    // Check if colorOptions are actually in the database
    const rawDoc = fetchedProduct.toObject();
    console.log("\n🔍 Raw document check:");
    console.log("Has colorOptions field:", 'colorOptions' in rawDoc);
    console.log("colorOptions value:", rawDoc.colorOptions);
    console.log("Is array:", Array.isArray(rawDoc.colorOptions));
    console.log("Length:", rawDoc.colorOptions?.length);

    if (rawDoc.colorOptions && rawDoc.colorOptions.length > 0) {
      console.log("\n✅ SUCCESS: colorOptions are properly saved in MongoDB!");
    } else {
      console.log("\n❌ FAILURE: colorOptions are NOT saved in MongoDB!");
    }

    await mongoose.connection.close();
    console.log("\nTest completed");
  } catch (error) {
    console.error("Test failed:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

testCreateProduct();
