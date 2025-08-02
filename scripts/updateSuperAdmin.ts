import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User';

// Load environment variables
dotenv.config();

const updateSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cms-system';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find the existing superadmin user
    const superAdmin = await User.findOne({ 
      $or: [
        { role: 'superadmin' },
        { email: 'superadmin@cms.local' },
        { username: 'superadmin' }
      ]
    });

    if (!superAdmin) {
      console.log('❌ No existing superadmin found');
      process.exit(1);
    }

    console.log('🔍 Found existing superadmin:', {
      id: superAdmin._id,
      username: superAdmin.username,
      email: superAdmin.email,
      role: superAdmin.role
    });

    // Update the role directly in the database to bypass validation
    const db = mongoose.connection.db;
    if (db) {
      await db.collection('users').updateOne(
        { _id: superAdmin._id as any },
        { $set: { role: 'superadmin' } }
      );
    }

    console.log('✅ SuperAdmin role updated successfully!');
    
    // Verify the update
    const updatedSuperAdmin = await User.findById(superAdmin._id);
    console.log('🔍 Verified updated superadmin:', {
      id: updatedSuperAdmin?._id,
      username: updatedSuperAdmin?.username,
      email: updatedSuperAdmin?.email,
      role: updatedSuperAdmin?.role
    });

  } catch (error: any) {
    console.error('❌ Error updating SuperAdmin:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the script
updateSuperAdmin();