import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User';
import { generateToken } from '../src/utils/jwt';

// Load environment variables
dotenv.config();

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cms-system';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if superadmin already exists
    const existingSuperAdmin = await User.findOne({ role: 'superadmin' });
    if (existingSuperAdmin) {
      console.log('⚠️ SuperAdmin already exists:', existingSuperAdmin.email);
      process.exit(0);
    }

    // Get superadmin details from command line or use defaults
    const username = process.argv[2] || 'huzaifayasin681';
    const email = process.argv[3] || 'huzaifayasin681@gmail.com';
    const password = process.argv[4] || 'Huzaifayasin681';
    const firstName = process.argv[5] || 'Super';
    const lastName = process.argv[6] || 'Admin';

    // Create superadmin user
    const superAdminData = {
      username,
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      role: 'superadmin',
      isActive: true,
      emailVerified: true,
      status: 'active',
      bio: 'System SuperAdmin with full access to all features and settings.'
    };

    const superAdmin = new User(superAdminData);
    await superAdmin.save();

    // Generate JWT token for immediate login
    const token = generateToken({
      userId: (superAdmin as any)._id.toString(),
      role: superAdmin.role,
      email: superAdmin.email
    });

    console.log('🎉 SuperAdmin created successfully!');
    console.log('📧 Email:', superAdmin.email);
    console.log('👤 Username:', superAdmin.username);
    console.log('🔑 Password:', password);
    console.log('🎫 Role:', superAdmin.role);
    console.log('🆔 ID:', superAdmin._id);
    console.log('🔐 JWT Token:', token);
    console.log('\n⚠️ IMPORTANT: Save these credentials securely!');
    console.log('💡 You can now login using these credentials.');

  } catch (error: any) {
    console.error('❌ Error creating SuperAdmin:', error.message);
    
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyValue)[0];
      const duplicateValue = error.keyValue[duplicateField];
      console.error(`❌ ${duplicateField.charAt(0).toUpperCase() + duplicateField.slice(1)} '${duplicateValue}' already exists.`);
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Usage information
const showUsage = () => {
  console.log('🚀 SuperAdmin Creator Script');
  console.log('');
  console.log('Usage:');
  console.log('  npm run create-superadmin [username] [email] [password] [firstName] [lastName]');
  console.log('');
  console.log('Examples:');
  console.log('  npm run create-superadmin');
  console.log('  npm run create-superadmin admin admin@example.com MySecurePass123 John Doe');
  console.log('');
  console.log('Defaults:');
  console.log('  username:  superadmin');
  console.log('  email:     superadmin@cms.local');
  console.log('  password:  SuperAdmin123!');
  console.log('  firstName: Super');
  console.log('  lastName:  Admin');
  console.log('');
};

// Show usage if help is requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showUsage();
  process.exit(0);
}

// Run the script
createSuperAdmin();