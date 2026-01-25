const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());

// Puppeteer-based Scraper (Headless Browser)
app.get('/api/user/:username', async (req, res) => {
    const { username } = req.params;
    console.log(`[Proxy] Launching browser for: ${username}`);

    let browser;
    try {
        if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
            // Production (Vercel)
            const chromium = require('@sparticuz/chromium');
            const puppeteer = require('puppeteer-core');

            // Adjust graphics mode for performance
            chromium.setGraphicsMode = false;

            browser = await puppeteer.launch({
                args: [...chromium.args, '--disable-dev-shm-usage', '--disable-gpu', '--single-process', '--no-zygote'],
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
                ignoreHTTPSErrors: true
            });
        } else {
            // Local Development
            const puppeteer = require('puppeteer');
            browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }
        const page = await browser.newPage();

        // 1. Set robust headers to look like a real Chrome user
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

        // 2. Go to page and wait for load
        // 2. Go to page and wait for load (FASTER STRATEGY)
        // 'networkidle2' is too slow for Vercel (waits for 500ms of no traffic).
        // 'domcontentloaded' fires as soon as HTML is ready.
        const instagramUrl = `https://www.instagram.com/${username}/`;
        await page.goto(instagramUrl, { waitUntil: 'domcontentloaded', timeout: 8000 }); // 8s timeout to fail fast

        // Auto-Scroll (Fast)
        // We just toggle scroll once to trigger basic hydration, no waiting 3s.
        await page.evaluate(async () => {
            window.scrollTo(0, document.body.scrollHeight);
        });

        // Debug: Check title
        const pageTitle = await page.title();
        console.log(`[Proxy] Page Title: "${pageTitle}"`);

        // 3. Hybrid Usage: DOM for Meta, Regex for Grid
        const metaData = await page.evaluate(() => {
            const getMeta = (prop) => document.querySelector(`meta[property="${prop}"]`)?.content || document.querySelector(`meta[name="${prop}"]`)?.content;
            return {
                title: getMeta('og:title'),
                image: getMeta('og:image'),
                description: getMeta('description')
            };
        });

        const pageContent = await page.content();

        // Strategy: REGEX DEEP SCAN (Broadest)
        // Find ANY https url ending in image extension (or with query params)
        // This regex is slightly looser to catch fbcdn etc.
        const urlRegex = /https:\/\/[^"'\s]+\.(jpg|png|webp|heic)/g;
        const allMatches = pageContent.match(urlRegex) || [];

        const rejected = [];

        // Filter and Clean
        const deepScanImages = allMatches
            .map(url => url.replace(/\\u0026/g, '&').replace(/&amp;/g, '&'))
            .filter(url => {
                const isStatic = url.includes('static.cdninstagram.com');
                const isProfile = url.includes('profile_pic') || url === metaData.image; // Check logic later

                // If it looks like a real image URL, keep it.
                // We will filter duplicates later.
                if (isStatic) {
                    rejected.push(`Static: ${url.slice(0, 30)}...`);
                    return false;
                }
                return true;
            });

        // Deduplicate
        const uniquePosts = [...new Set(deepScanImages)];

        // Final filter: Remove the Profile Pic variants
        // Extract the unique ID from the Meta Image if possible (usually the long number)
        const pfpIdMatch = (metaData.image || '').match(/\/([0-9_n]+)\.jpg/);
        const pfpId = pfpIdMatch ? pfpIdMatch[1] : 'NEVERMATCH';

        const finalPosts = uniquePosts
            .filter(url => !url.includes(pfpId) && !url.includes('profile_pic'))
            .slice(0, 50); // "Infinite" Grid Request (up to 50)

        console.log(`[Proxy] Deep Scan Found: ${allMatches.length} raw URLs.`);
        console.log(`[Proxy] Rejected PFP ID: ${pfpId}`);
        console.log(`[Proxy] Returning: ${finalPosts.length} posts.`);
        console.log(`[Proxy] Sample:`, finalPosts.slice(0, 2));

        console.log(`[Proxy] Extracted Meta:`, metaData);

        // 4. Parse Structured Data (Stats & Bio)
        // Format: "1,667 Followers, 208 Following, 12 Posts - See Instagram photos and videos from Iésu Jafé (@iesucafe)"
        // OR: "... - Iésu Jafé (@iesucafe) on Instagram: "BIO TEXT""

        let stats = { followers: '0', following: '0', posts: '0' };
        let realName = username; // Default
        let bio = '';

        if (metaData.description) {
            // 1. Stats
            const statsMatch = metaData.description.match(/^([0-9.,BKMN]+)\s+Followers,\s+([0-9.,BKMN]+)\s+Following,\s+([0-9.,BKMN]+)\s+Posts/i);
            if (statsMatch) {
                stats.followers = statsMatch[1];
                stats.following = statsMatch[2];
                stats.posts = statsMatch[3];
            }

            // 2. Name
            // Look for "from NAME (@handle)" or "- NAME (@handle)"
            const nameMatch = metaData.description.match(/from\s+(.+) \(@/i) || metaData.description.match(/-\s+(.+) \(@/i);
            if (nameMatch) {
                realName = nameMatch[1];
            }

            // 3. Bio
            // Look for quotes at end: : "BIO TEXT"
            // Or use the title if bio isn't in description
            const bioMatch = metaData.description.match(/: "([^"]+)"$/);
            if (bioMatch) {
                bio = bioMatch[1];
            }
        }

        const profile = {
            username: username,
            realName: realName,
            bio: bio,
            avatar: metaData.image || 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg',
            stats: stats,
            posts: uniquePosts
        };

        console.log(`[Proxy] Returns Parsed Profile:`, JSON.stringify(profile, null, 2));

        res.json(profile);
    } catch (error) {
        console.error('[Proxy] Puppeteer Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch Profile via Browser.' });
    } finally {
        if (browser) await browser.close();
    }
});

// Export for Vercel / Serverless
// (Triggering Rebuild)
module.exports = app;

// Only listen if run directly (Local Dev)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`B.L.A.S.T. Bridge (Puppeteer Edition) running at http://localhost:${PORT}`);
        console.log(`Ready for requests...`);
    });
}
