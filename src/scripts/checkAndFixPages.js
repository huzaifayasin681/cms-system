const mongoose = require('mongoose');

const checkAndFixPages = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cms-system');
    console.log('Connected to MongoDB');
    
    // First, let's see what's actually in the database
    const allPages = await mongoose.connection.db.collection('pages').find({}).toArray();
    console.log('All pages in database:');
    allPages.forEach(page => {
      console.log(`- ${page.title}: showInMenu=${page.showInMenu} (type: ${typeof page.showInMenu})`);
    });
    
    // Find pages where showInMenu is undefined/missing
    const pagesWithUndefinedShowInMenu = await mongoose.connection.db.collection('pages').find({
      $or: [
        { showInMenu: { $exists: false } },
        { showInMenu: null },
        { showInMenu: undefined }
      ]
    }).toArray();
    
    console.log(`\nFound ${pagesWithUndefinedShowInMenu.length} pages with undefined/null showInMenu`);
    
    if (pagesWithUndefinedShowInMenu.length > 0) {
      console.log('Fixing these pages...');
      const result = await mongoose.connection.db.collection('pages').updateMany(
        {
          $or: [
            { showInMenu: { $exists: false } },
            { showInMenu: null },
            { showInMenu: undefined }
          ]
        },
        { $set: { showInMenu: true } }
      );
      console.log(`Updated ${result.modifiedCount} pages`);
    } else {
      console.log('All pages already have showInMenu field set');
    }
    
    // Show final state
    console.log('\nFinal state of all pages:');
    const finalPages = await mongoose.connection.db.collection('pages').find({}).toArray();
    finalPages.forEach(page => {
      console.log(`- ${page.title}: showInMenu=${page.showInMenu} (type: ${typeof page.showInMenu})`);
    });
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

checkAndFixPages();