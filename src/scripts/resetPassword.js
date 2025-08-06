const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cms_system';

// User schema (simplified)
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: String,
  isActive: Boolean,
  emailVerified: Boolean
});

const User = mongoose.model('User', userSchema);

async function resetPassword() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const username = 'huzaifayasin681';
    const newPassword = 'test';
    
    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update the user's password
    const result = await User.updateOne(
      { username: username },
      { 
        password: hashedPassword,
        isActive: true,
        emailVerified: true
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`Password updated successfully for user: ${username}`);
      console.log(`New password: ${newPassword}`);
    } else {
      console.log(`User ${username} not found or password not changed`);
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetPassword();