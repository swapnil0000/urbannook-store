require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const clearProducts = async () => {
  try {
    const dbName = process.env.DB_NAME || 'un';
    await mongoose.connect(process.env.DB_URI, {
      dbName: dbName
    });
    console.log(`Connected to MongoDB (database: ${dbName})`);

    const result = await Product.deleteMany({});
    console.log(`Deleted ${result.deletedCount} products`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error clearing products:', error);
    process.exit(1);
  }
};

clearProducts();
