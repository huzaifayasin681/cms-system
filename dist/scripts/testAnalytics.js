"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Analytics_1 = __importDefault(require("../models/Analytics"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function testAnalytics() {
    try {
        console.log('🧪 Testing analytics data...');
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is required');
        }
        await mongoose_1.default.connect(mongoUri);
        console.log('📚 Connected to MongoDB');
        const totalEvents = await Analytics_1.default.countDocuments();
        console.log(`📊 Total analytics events: ${totalEvents}`);
        const searchTerms = await Analytics_1.default.aggregate([
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
        const trafficSources = await Analytics_1.default.aggregate([
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
        const deviceBreakdown = await Analytics_1.default.aggregate([
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
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const dailyViews = await Analytics_1.default.aggregate([
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
        const browserBreakdown = await Analytics_1.default.aggregate([
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
    }
    catch (error) {
        console.error('❌ Error testing analytics:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
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
exports.default = testAnalytics;
//# sourceMappingURL=testAnalytics.js.map