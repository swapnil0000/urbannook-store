require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'un'
    });
    console.log('Connected to MongoDB (database: un)');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'root@root.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create new admin
    const admin = new Admin({
      email: 'root@root.com',
      password: 'Swapnil@1234'
    });

    await admin.save();
    console.log('Admin user created successfully');
    console.log('Email: root@root.com');
    console.log('Password: Swapnil@1234');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();
