const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());

// HTTP-based Scraper (No Puppeteer)
app.get('/api/user/:username', async (req, res) => {
    const { username } = req.params;
    console.log(`[Proxy] Fetching HTML for: ${username}`);

    try {
        const instagramUrl = `https://www.instagram.com/${username}/`;

        // Use Fetch (Native in Node 18+)
        const response = await fetch(instagramUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const html = await response.text();
        console.log(`[Proxy] Downloaded ${html.length} bytes.`);

        // 1. Parse Meta Data (OG Tags)
        const getMeta = (prop) => {
            const regex = new RegExp(`<meta property="${prop}" content="([^"]+)"`);
            const match = html.match(regex);
            return match ? match[1] : null;
        };

        const metaData = {
            title: getMeta('og:title') || `${username} on Instagram`,
            image: getMeta('og:image'),
            description: getMeta('og:description') || getMeta('description')
        };

        // 2. Regex Deep Scan for Images
        // Find URLs ending in jpg/png/heic (loosely)
        // Instagram images often look like: https://scontent... .jpg?stp=...
        const urlRegex = /https:\/\/[^"'\s]+\.(jpg|png|webp|heic)/g;
        const allMatches = html.match(urlRegex) || [];

        const rejected = [];
        const uniquePosts = [...new Set(allMatches)].filter(url => {
            // Filter out static assets, emojis, or the profile pic itself (if duplicate)
            if (url.includes('static.cdninstagram.com')) return false;
            // Filter out small thumbnails if possible (s150x150) - hard to detect in raw url sometimes
            return true;
        });

        // Try to filter pfp
        const pfp = metaData.image;
        const finalPosts = uniquePosts.filter(url => url !== pfp).slice(0, 12);

        // 3. Parse Stats/Bio from Description
        // "10k Followers, 50 Following, 100 Posts - ..."
        let stats = { followers: '0', following: '0', posts: '0' };
        let bio = '';
        let realName = username;

        if (metaData.description) {
            const statsMatch = metaData.description.match(/^([0-9.,BKMN]+)\s+Followers,\s+([0-9.,BKMN]+)\s+Following,\s+([0-9.,BKMN]+)\s+Posts/i);
            if (statsMatch) {
                stats.followers = statsMatch[1];
                stats.following = statsMatch[2];
                stats.posts = statsMatch[3];
            }

            // Name/Bio extraction is messier with regex on raw HTML, we'll keep it simple
        }

        const profile = {
            username: username,
            realName: realName,
            bio: bio || metaData.description, // Fallback
            avatar: pfp || 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Default_pfp.svg',
            stats: stats,
            posts: finalPosts
        };

        // Check against Login Wall
        if (html.includes('Login • Instagram') || !metaData.title) {
            console.warn('[Proxy] Possible Login Wall detected.');
            // We might still have some images from public cache, but likely not.
            if (finalPosts.length === 0) {
                // Throwing error allows the Frontend to handle it (or show Mock if we enabled it, but we disabled it).
                // Actually, let's return a special "Empty" state so user knows.
            }
        }

        console.log(`[Proxy] Success. Found ${finalPosts.length} images.`);
        res.json(profile);

    } catch (error) {
        console.error('[Proxy] Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch Profile via HTTP.' });
    }
});

// Export for Vercel
module.exports = app;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`B.L.A.S.T. Bridge (HTTP Edition) running at http://localhost:${PORT}`);
    });
}
