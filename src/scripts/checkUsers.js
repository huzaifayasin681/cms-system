const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cms_system';

// User schema (simplified)
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  role: String,
  isActive: Boolean,
  emailVerified: Boolean
});

const User = mongoose.model('User', userSchema);

async function checkUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const users = await User.find({}, 'username email role isActive emailVerified');
    console.log('Existing users:');
    console.table(users.map(user => ({
      username: user.username,
      email: user.email,
      role: user.role,
      active: user.isActive,
      verified: user.emailVerified
    })));
    
    if (users.length === 0) {
      console.log('No users found in database');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers();