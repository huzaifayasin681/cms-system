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
  password: String,
  role: String,
  isActive: Boolean,
  emailVerified: Boolean
});

const User = mongoose.model('User', userSchema);

async function verifyUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const username = 'huzaifayasin681';
    
    // Update the user to be verified and active
    const result = await User.updateOne(
      { username: username },
      { 
        isActive: true,
        emailVerified: true
      }
    );
    
    if (result.modifiedCount > 0 || result.matchedCount > 0) {
      console.log(`User ${username} verified and activated successfully`);
      
      // Show updated user
      const user = await User.findOne({ username }, 'username email role isActive emailVerified');
      console.log('Updated user:', user);
    } else {
      console.log(`User ${username} not found`);
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyUser();