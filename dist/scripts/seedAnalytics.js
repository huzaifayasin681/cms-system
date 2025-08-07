"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Analytics_1 = __importDefault(require("../models/Analytics"));
const Post_1 = __importDefault(require("../models/Post"));
const Page_1 = __importDefault(require("../models/Page"));
const User_1 = __importDefault(require("../models/User"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const searchTerms = [
    'react tutorial', 'javascript tips', 'web development', 'nodejs guide', 'css tricks',
    'mongodb tutorial', 'typescript basics', 'responsive design', 'api development', 'frontend development',
    'backend development', 'full stack developer', 'programming tutorial', 'coding best practices', 'software engineering'
];
const referrers = [
    '',
    'https://google.com/search?q=react+tutorial',
    'https://google.com/search?q=javascript+tips',
    'https://bing.com/search?q=web+development',
    'https://facebook.com',
    'https://twitter.com',
    'https://linkedin.com',
    'https://github.com',
    'https://stackoverflow.com',
    'https://dev.to',
    'https://medium.com',
    'https://reddit.com/r/programming'
];
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
];
function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}
function getRandomDate(daysAgo) {
    const now = Date.now();
    const pastTime = now - (daysAgo * 24 * 60 * 60 * 1000);
    const randomTime = pastTime + Math.random() * (now - pastTime);
    return new Date(randomTime);
}
function parseUserAgent(userAgent) {
    const ua = userAgent.toLowerCase();
    let deviceType = 'desktop';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        deviceType = 'mobile';
    }
    else if (ua.includes('tablet') || ua.includes('ipad')) {
        deviceType = 'tablet';
    }
    let browser = 'unknown';
    if (ua.includes('chrome'))
        browser = 'chrome';
    else if (ua.includes('firefox'))
        browser = 'firefox';
    else if (ua.includes('safari'))
        browser = 'safari';
    else if (ua.includes('edge'))
        browser = 'edge';
    let os = 'unknown';
    if (ua.includes('windows'))
        os = 'windows';
    else if (ua.includes('mac'))
        os = 'macos';
    else if (ua.includes('linux'))
        os = 'linux';
    else if (ua.includes('android'))
        os = 'android';
    else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad'))
        os = 'ios';
    return { deviceType, browser, os };
}
async function seedAnalytics() {
    try {
        console.log('🌱 Starting analytics seeding...');
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is required');
        }
        await mongoose_1.default.connect(mongoUri);
        console.log('📚 Connected to MongoDB');
        const posts = await Post_1.default.find({ status: 'published' }).select('_id title slug');
        const pages = await Page_1.default.find().select('_id title slug');
        const users = await User_1.default.find().select('_id');
        if (posts.length === 0) {
            console.log('⚠️ No published posts found. Please create some posts first.');
            return;
        }
        console.log(`📖 Found ${posts.length} posts, ${pages.length} pages, ${users.length} users`);
        await Analytics_1.default.deleteMany({});
        console.log('🧹 Cleared existing analytics events');
        const events = [];
        const daysToGenerate = 60;
        const eventsPerDay = Math.floor(Math.random() * 50) + 20;
        for (let day = 0; day < daysToGenerate; day++) {
            for (let eventIndex = 0; eventIndex < eventsPerDay; eventIndex++) {
                const timestamp = getRandomDate(day);
                const userAgent = getRandomItem(userAgents);
                const deviceInfo = parseUserAgent(userAgent);
                const referrer = getRandomItem(referrers);
                const user = Math.random() > 0.7 ? getRandomItem(users) : null;
                const eventType = Math.random();
                if (eventType < 0.4) {
                    const post = getRandomItem(posts);
                    events.push({
                        eventType: 'post_view',
                        resourceType: 'post',
                        resourceId: post._id,
                        userId: user?._id,
                        sessionId: `session_${Math.random().toString(36).substr(2, 9)}`,
                        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                        userAgent,
                        referrer,
                        metadata: {
                            ...deviceInfo,
                            source: referrer ? 'referral' : 'direct',
                            postTitle: post.title,
                            postSlug: post.slug
                        },
                        timestamp
                    });
                }
                else if (eventType < 0.6) {
                    if (pages.length > 0) {
                        const page = getRandomItem(pages);
                        events.push({
                            eventType: 'page_view',
                            resourceType: 'page',
                            resourceId: page._id,
                            userId: user?._id,
                            sessionId: `session_${Math.random().toString(36).substr(2, 9)}`,
                            ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                            userAgent,
                            referrer,
                            metadata: {
                                ...deviceInfo,
                                source: referrer ? 'referral' : 'direct',
                                pageTitle: page.title,
                                pageSlug: page.slug
                            },
                            timestamp
                        });
                    }
                }
                else if (eventType < 0.8) {
                    const searchTerm = getRandomItem(searchTerms);
                    events.push({
                        eventType: 'search',
                        resourceType: 'search',
                        userId: user?._id,
                        sessionId: `session_${Math.random().toString(36).substr(2, 9)}`,
                        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                        userAgent,
                        referrer,
                        metadata: {
                            ...deviceInfo,
                            searchTerm,
                            resultsCount: Math.floor(Math.random() * 20) + 1,
                            filters: {
                                category: Math.random() > 0.8 ? 'tutorial' : null,
                                tags: Math.random() > 0.7 ? ['javascript', 'react'] : null
                            }
                        },
                        timestamp
                    });
                }
                else if (eventType < 0.95) {
                    if (user) {
                        const post = getRandomItem(posts);
                        events.push({
                            eventType: 'like',
                            resourceType: 'post',
                            resourceId: post._id,
                            userId: user._id,
                            sessionId: `session_${Math.random().toString(36).substr(2, 9)}`,
                            ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                            userAgent,
                            referrer,
                            metadata: {
                                ...deviceInfo,
                                action: 'toggle_like',
                                postTitle: post.title
                            },
                            timestamp
                        });
                    }
                }
                else {
                    const post = getRandomItem(posts);
                    const shareDestinations = ['facebook', 'twitter', 'linkedin', 'email', 'copy_link'];
                    events.push({
                        eventType: 'share',
                        resourceType: 'post',
                        resourceId: post._id,
                        userId: user?._id,
                        sessionId: `session_${Math.random().toString(36).substr(2, 9)}`,
                        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                        userAgent,
                        referrer,
                        metadata: {
                            ...deviceInfo,
                            shareDestination: getRandomItem(shareDestinations),
                            postTitle: post.title
                        },
                        timestamp
                    });
                }
            }
        }
        const batchSize = 1000;
        for (let i = 0; i < events.length; i += batchSize) {
            const batch = events.slice(i, i + batchSize);
            await Analytics_1.default.insertMany(batch);
            console.log(`📊 Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(events.length / batchSize)}`);
        }
        console.log(`✅ Successfully seeded ${events.length} analytics events`);
        const eventTypeCounts = await Analytics_1.default.aggregate([
            {
                $group: {
                    _id: '$eventType',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);
        console.log('\n📈 Event type distribution:');
        eventTypeCounts.forEach(({ _id, count }) => {
            console.log(`  ${_id}: ${count} events`);
        });
        const topSearchTerms = await Analytics_1.default.aggregate([
            { $match: { eventType: 'search' } },
            {
                $group: {
                    _id: '$metadata.searchTerm',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        console.log('\n🔍 Top search terms:');
        topSearchTerms.forEach(({ _id, count }) => {
            console.log(`  "${_id}": ${count} searches`);
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
    }
    catch (error) {
        console.error('❌ Error seeding analytics:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}
if (require.main === module) {
    seedAnalytics()
        .then(() => {
        console.log('🎉 Analytics seeding completed!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Seeding failed:', error);
        process.exit(1);
    });
}
exports.default = seedAnalytics;
