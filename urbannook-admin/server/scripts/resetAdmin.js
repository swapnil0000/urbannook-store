require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const resetAdmin = async () => {
  try {
    const dbName = process.env.DB_NAME || 'un';
    await mongoose.connect(process.env.DB_URI, {
      dbName: dbName
    });
    console.log(`Connected to MongoDB (database: ${dbName})`);

    // Delete existing admin
    await Admin.deleteMany({ email: 'root@root.com' });
    console.log('Deleted existing admin user');

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
    console.error('Error resetting admin:', error);
    process.exit(1);
  }
};

resetAdmin();
