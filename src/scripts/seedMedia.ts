import mongoose from 'mongoose';
import Media from '../models/Media';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

// Sample media data
const sampleMedia = [
  {
    filename: 'hero-image-1.jpg',
    originalName: 'business-hero.jpg',
    mimetype: 'image/jpeg',
    size: 524288, // 512KB
    type: 'image',
    url: 'https://res.cloudinary.com/dtkyzim74/image/upload/v1753255850/hero-image-1.jpg',
    publicId: 'hero-image-1',
    alt: 'Business team working together',
    caption: 'Professional business team collaboration'
  },
  {
    filename: 'blog-post-1.jpg',
    originalName: 'tech-blog-image.jpg',
    mimetype: 'image/jpeg',
    size: 387654, // ~378KB
    type: 'image',
    url: 'https://res.cloudinary.com/dtkyzim74/image/upload/v1753255850/blog-post-1.jpg',
    publicId: 'blog-post-1',
    alt: 'Technology and coding',
    caption: 'Modern web development workspace'
  },
  {
    filename: 'about-team.jpg',
    originalName: 'team-photo.jpg',
    mimetype: 'image/jpeg',
    size: 768432, // ~750KB
    type: 'image',
    url: 'https://res.cloudinary.com/dtkyzim74/image/upload/v1753255850/about-team.jpg',
    publicId: 'about-team',
    alt: 'Our team members',
    caption: 'Meet our talented team'
  },
  {
    filename: 'tutorial-video.mp4',
    originalName: 'react-tutorial.mp4',
    mimetype: 'video/mp4',
    size: 15728640, // 15MB
    type: 'video',
    url: 'https://res.cloudinary.com/dtkyzim74/video/upload/v1753255850/tutorial-video.mp4',
    publicId: 'tutorial-video',
    alt: 'React tutorial video',
    caption: 'Complete React tutorial for beginners'
  },
  {
    filename: 'presentation.pdf',
    originalName: 'company-presentation.pdf',
    mimetype: 'application/pdf',
    size: 2097152, // 2MB
    type: 'document',
    url: 'https://res.cloudinary.com/dtkyzim74/raw/upload/v1753255850/presentation.pdf',
    publicId: 'presentation',
    alt: 'Company presentation slides',
    caption: 'Our company overview and services'
  },
  {
    filename: 'logo.svg',
    originalName: 'company-logo.svg',
    mimetype: 'image/svg+xml',
    size: 12345, // ~12KB
    type: 'image',
    url: 'https://res.cloudinary.com/dtkyzim74/image/upload/v1753255850/logo.svg',
    publicId: 'logo',
    alt: 'Company logo',
    caption: 'Official company logo'
  },
  {
    filename: 'product-demo.gif',
    originalName: 'app-demo.gif',
    mimetype: 'image/gif',
    size: 1048576, // 1MB
    type: 'image',
    url: 'https://res.cloudinary.com/dtkyzim74/image/upload/v1753255850/product-demo.gif',
    publicId: 'product-demo',
    alt: 'Product demonstration',
    caption: 'See our product in action'
  },
  {
    filename: 'background-music.mp3',
    originalName: 'intro-music.mp3',
    mimetype: 'audio/mpeg',
    size: 5242880, // 5MB
    type: 'audio',
    url: 'https://res.cloudinary.com/dtkyzim74/video/upload/v1753255850/background-music.mp3',
    publicId: 'background-music',
    alt: 'Background music track',
    caption: 'Intro background music'
  }
];

function getRandomDate(daysAgo: number): Date {
  const now = Date.now();
  const pastTime = now - (daysAgo * 24 * 60 * 60 * 1000);
  const randomTime = pastTime + Math.random() * (now - pastTime);
  return new Date(randomTime);
}

async function seedMedia() {
  try {
    console.log('📁 Starting media seeding...');

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    await mongoose.connect(mongoUri);
    console.log('📚 Connected to MongoDB');

    // Get a user to assign as uploader
    const users = await User.find().limit(5);
    if (users.length === 0) {
      console.log('⚠️ No users found. Media will be created without uploader.');
    }

    // Check if media already exists
    const existingMedia = await Media.countDocuments();
    console.log(`📄 Found ${existingMedia} existing media files`);

    if (existingMedia > 0) {
      console.log('✅ Media files already exist. Skipping seeding.');
      return;
    }

    const mediaToCreate = [];

    // Create variations of the sample media over different time periods
    for (let i = 0; i < 20; i++) {
      const baseMedium = sampleMedia[i % sampleMedia.length];
      const uploadDate = getRandomDate(Math.floor(Math.random() * 90)); // Last 90 days
      const user = users[Math.floor(Math.random() * users.length)];

      const medium = {
        ...baseMedium,
        filename: `${baseMedium.filename.split('.')[0]}-${i + 1}.${baseMedium.filename.split('.')[1]}`,
        originalName: `${baseMedium.originalName.split('.')[0]}-${i + 1}.${baseMedium.originalName.split('.')[1]}`,
        url: `${baseMedium.url.split('.').slice(0, -1).join('.')}-${i + 1}.${baseMedium.url.split('.').pop()}`,
        publicId: `${baseMedium.publicId}-${i + 1}`,
        size: baseMedium.size + Math.floor(Math.random() * 100000), // Add some variation
        uploader: user?._id,
        uploadedAt: uploadDate,
        folder: i < 10 ? 'blog' : i < 15 ? 'assets' : 'uploads'
      };

      mediaToCreate.push(medium);
    }

    // Insert media files
    await Media.insertMany(mediaToCreate);
    console.log(`✅ Successfully seeded ${mediaToCreate.length} media files`);

    // Print summary statistics
    const mediaStats = await Media.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalSize: { $sum: '$size' },
          avgSize: { $avg: '$size' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📊 Media type distribution:');
    mediaStats.forEach(({ _id, count, totalSize, avgSize }) => {
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
      const avgSizeMB = (avgSize / (1024 * 1024)).toFixed(2);
      console.log(`  ${_id}: ${count} files (${totalSizeMB}MB total, ${avgSizeMB}MB avg)`);
    });

    const folderStats = await Media.aggregate([
      {
        $group: {
          _id: '$folder',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📂 Folder distribution:');
    folderStats.forEach(({ _id, count }) => {
      console.log(`  ${_id || 'root'}: ${count} files`);
    });

    const totalStorage = await Media.aggregate([
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }
      }
    ]);

    if (totalStorage[0]) {
      const totalSizeGB = (totalStorage[0].totalSize / (1024 * 1024 * 1024)).toFixed(3);
      console.log(`\n💾 Total storage: ${totalStorage[0].totalFiles} files, ${totalSizeGB}GB`);
    }

  } catch (error) {
    console.error('❌ Error seeding media:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

if (require.main === module) {
  seedMedia()
    .then(() => {
      console.log('🎉 Media seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export default seedMedia;