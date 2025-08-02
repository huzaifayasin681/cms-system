const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// Import User model
const User = require('../dist/models/User').default;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createFirstAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://huzaifafewb:huzaifafewb@healthcare.uh5yc.mongodb.net/?retryWrites=true&w=majority&appName=healthCare');
    console.log('Connected to MongoDB');

    // Check if any admin exists
    const existingAdmin = await User.findOne({ role: 'admin', status: 'active' });
    if (existingAdmin) {
      console.log('An active admin user already exists:', existingAdmin.username);
      rl.close();
      mongoose.disconnect();
      return;
    }

    console.log('No active admin found. Creating first admin user...\n');

    // Get admin details
    const username = await question('Enter admin username: ');
    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password: ');
    const firstName = await question('Enter first name (optional): ');
    const lastName = await question('Enter last name (optional): ');

    // Validate input
    if (!username || !email || !password) {
      console.log('Username, email, and password are required!');
      rl.close();
      mongoose.disconnect();
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      console.log('User already exists with this email or username!');
      rl.close();
      mongoose.disconnect();
      return;
    }

    // Create admin user
    const adminUser = new User({
      username,
      email,
      password,
      role: 'admin',
      status: 'active',
      emailVerified: true,
      firstName: firstName || undefined,
      lastName: lastName || undefined
    });

    await adminUser.save();

    console.log('\n✅ First admin user created successfully!');
    console.log('Admin Details:');
    console.log('- Username:', adminUser.username);
    console.log('- Email:', adminUser.email);
    console.log('- Role:', adminUser.role);
    console.log('- Status:', adminUser.status);
    console.log('\nYou can now log in with these credentials.');

  } catch (error) {
    console.error('Error creating admin user:', error.message);
  } finally {
    rl.close();
    mongoose.disconnect();
  }
}

createFirstAdmin();