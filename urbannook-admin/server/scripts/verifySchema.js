require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");

async function verifySchema() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear any cached models
    delete mongoose.connection.models.Product;
    
    // Re-require the model
    const Product = require("../models/Product");

    console.log("\n📋 Product Schema Definition:");
    console.log("=" .repeat(80));
    
    const schemaPaths = Product.schema.paths;
    
    // Check if colorOptions exists in schema
    if (schemaPaths.colorOptions) {
      console.log("\n✅ colorOptions field EXISTS in schema");
      console.log("   Type:", schemaPaths.colorOptions.instance);
      console.log("   Path:", schemaPaths.colorOptions.path);
      console.log("   Schema Type:", schemaPaths.colorOptions.constructor.name);
      
      // Check if it's an array
      if (schemaPaths.colorOptions.instance === 'Array') {
        console.log("   ✅ Correctly defined as Array");
        console.log("   Array item type:", schemaPaths.colorOptions.caster?.instance);
      }
    } else {
      console.log("\n❌ colorOptions field DOES NOT EXIST in schema");
    }

    console.log("\n📝 All Schema Fields:");
    console.log("=" .repeat(80));
    Object.keys(schemaPaths).forEach(path => {
      if (!path.startsWith('_')) {
        console.log(`   - ${path}: ${schemaPaths[path].instance}`);
      }
    });

    // Check the actual collection in MongoDB
    console.log("\n🗄️  MongoDB Collection Info:");
    console.log("=" .repeat(80));
    const collections = await mongoose.connection.db.listCollections().toArray();
    const productCollection = collections.find(c => c.name === 'products');
    
    if (productCollection) {
      console.log("   Collection 'products' exists");
      
      // Get a sample document to see its structure
      const sampleDoc = await mongoose.connection.db.collection('products').findOne({});
      if (sampleDoc) {
        console.log("\n   Sample document fields:");
        Object.keys(sampleDoc).forEach(key => {
          console.log(`   - ${key}: ${typeof sampleDoc[key]}`);
        });
        
        if ('colorOptions' in sampleDoc) {
          console.log("\n   ✅ colorOptions exists in database documents");
          console.log(`   Value: ${JSON.stringify(sampleDoc.colorOptions)}`);
        } else {
          console.log("\n   ❌ colorOptions does NOT exist in database documents");
        }
      }
    }

    await mongoose.connection.close();
    console.log("\n" + "=".repeat(80));
    console.log("Verification completed");
  } catch (error) {
    console.error("Verification failed:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

verifySchema();
