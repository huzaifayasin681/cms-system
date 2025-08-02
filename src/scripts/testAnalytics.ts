import mongoose from 'mongoose';
import AnalyticsEvent from '../models/Analytics';
import dotenv from 'dotenv';

dotenv.config();

async function testAnalytics() {
  try {
    console.log('🧪 Testing analytics data...');

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    await mongoose.connect(mongoUri);
    console.log('📚 Connected to MongoDB');

    // Test 1: Total events count
    const totalEvents = await AnalyticsEvent.countDocuments();
    console.log(`📊 Total analytics events: ${totalEvents}`);

    // Test 2: Search terms analysis
    const searchTerms = await AnalyticsEvent.aggregate([
      { 
        $match: { 
          eventType: 'search',
          'metadata.searchTerm': { $exists: true, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$metadata.searchTerm',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    console.log('\n🔍 Top 5 search terms:');
    searchTerms.forEach(({ _id, count }) => {
      console.log(`  "${_id}": ${count} searches`);
    });

    // Test 3: Traffic sources analysis
    const trafficSources = await AnalyticsEvent.aggregate([
      { 
        $match: { 
          eventType: { $in: ['page_view', 'post_view'] }
        }
      },
      {
        $addFields: {
          trafficSource: {
            $cond: {
              if: { $or: [{ $eq: ['$referrer', null] }, { $eq: ['$referrer', ''] }] },
              then: 'Direct',
              else: {
                $cond: {
                  if: { $regexMatch: { input: '$referrer', regex: /google|bing|yahoo|duckduckgo/i } },
                  then: 'Search Engines',
                  else: {
                    $cond: {
                      if: { $regexMatch: { input: '$referrer', regex: /facebook|twitter|instagram|linkedin|youtube/i } },
                      then: 'Social Media',
                      else: 'Referrals'
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$trafficSource',
          visits: { $sum: 1 }
        }
      },
      { $sort: { visits: -1 } }
    ]);

    console.log('\n🌐 Traffic sources:');
    const totalTraffic = trafficSources.reduce((sum, source) => sum + source.visits, 0);
    trafficSources.forEach(({ _id, visits }) => {
      const percentage = ((visits / totalTraffic) * 100).toFixed(1);
      console.log(`  ${_id}: ${visits} visits (${percentage}%)`);
    });

    // Test 4: Device breakdown
    const deviceBreakdown = await AnalyticsEvent.aggregate([
      {
        $group: {
          _id: '$metadata.deviceType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📱 Device breakdown:');
    deviceBreakdown.forEach(({ _id, count }) => {
      console.log(`  ${_id}: ${count} events`);
    });

    // Test 5: Daily views for last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dailyViews = await AnalyticsEvent.aggregate([
      { 
        $match: { 
          eventType: { $in: ['page_view', 'post_view'] },
          timestamp: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          views: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log('\n📈 Daily views (last 7 days):');
    dailyViews.forEach(({ _id, views }) => {
      console.log(`  ${_id}: ${views} views`);
    });

    // Test 6: Browser breakdown
    const browserBreakdown = await AnalyticsEvent.aggregate([
      {
        $group: {
          _id: '$metadata.browser',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    console.log('\n🌐 Top browsers:');
    browserBreakdown.forEach(({ _id, count }) => {
      console.log(`  ${_id}: ${count} events`);
    });

    console.log('\n✅ Analytics test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing analytics:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

if (require.main === module) {
  testAnalytics()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

export default testAnalytics;