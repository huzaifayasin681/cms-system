const mongoose = require('mongoose');

// Simple script to fix existing pages with undefined showInMenu, menuOrder, isHomePage fields
const fixPageFields = async () => {
  try {
    // Connect to MongoDB (adjust the connection string as needed)
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cms-system');
    
    console.log('Connected to MongoDB');
    
    // Update all pages that have undefined showInMenu to true (show by default)
    const result1 = await mongoose.connection.db.collection('pages').updateMany(
      { showInMenu: { $exists: false } },
      { $set: { showInMenu: true } }
    );
    console.log(`Updated ${result1.modifiedCount} pages with missing showInMenu field`);
    
    // Update all pages that have undefined menuOrder
    const result2 = await mongoose.connection.db.collection('pages').updateMany(
      { menuOrder: { $exists: false } },
      { $set: { menuOrder: 0 } }
    );
    console.log(`Updated ${result2.modifiedCount} pages with missing menuOrder field`);
    
    // Update all pages that have undefined isHomePage
    const result3 = await mongoose.connection.db.collection('pages').updateMany(
      { isHomePage: { $exists: false } },
      { $set: { isHomePage: false } }
    );
    console.log(`Updated ${result3.modifiedCount} pages with missing isHomePage field`);
    
    // Also update any pages that have null values to true
    const result4 = await mongoose.connection.db.collection('pages').updateMany(
      { showInMenu: null },
      { $set: { showInMenu: true } }
    );
    console.log(`Updated ${result4.modifiedCount} pages with null showInMenu field`);
    
    console.log('Migration completed successfully');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the migration
fixPageFields();