const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());

// HTTP-based Scraper (Mobile UA Strategy)
app.get('/api/user/:username', async (req, res) => {
    const { username } = req.params;
    console.log(`[Scraper] Fetching for: ${username}`);

    try {
        // Strategy: Impersonate a Mobile App/Browser to bypass Desktop Login Wall
        // This UA is from a popular PHP scraper that is known to work
        const mobileUA = 'Instagram 250.0.0.21.109 Android (29/10; 420dpi; 1080x2260; samsung; SM-G960F; starlte; samsungexynos9810; en_US; 397184279)';

        const targetUrl = `https://www.instagram.com/${username}/`;

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': mobileUA,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        if (!response.ok) {
            throw new Error(`Instagram Error: ${response.status}`);
        }

        const html = await response.text();
        console.log(`[Scraper] Downloaded ${html.length} bytes.`);

        // 1. Parse Meta Data (OG Tags) - These are usually present even in Mobile View
        const getMeta = (prop) => {
            const regex = new RegExp(`<meta (?:property|name)="${prop}" content="([^"]+)"`);
            const match = html.match(regex);
            return match ? match[1] : null;
        };

        const metaData = {
            title: getMeta('og:title') || `${username}`,
            image: getMeta('og:image'),
            description: getMeta('og:description') || getMeta('description')
        };

        // 2. Parse Stats from Description
        // "1,667 Followers, 208 Following, 12 Posts - ..."
        let stats = { followers: '0', following: '0', posts: '0' };

        if (metaData.description) {
            const statsMatch = metaData.description.match(/^([0-9.,BKMN]+)\s+Followers,\s+([0-9.,BKMN]+)\s+Following,\s+([0-9.,BKMN]+)\s+Posts/i);
            if (statsMatch) {
                stats.followers = statsMatch[1];
                stats.following = statsMatch[2];
                stats.posts = statsMatch[3];
            }
        }

        // 3. Scan for Images (Best Effort)
        // Mobile HTML often doesn't have the grid, but might have some assets.
        // We look for any large JPEG that isn't the profile pic.
        const urlRegex = /https:\/\/[^"'\s<>]*(?:cdninstagram|scontent|fbcdn)[^"'\s<>]*?(?:jpg|png|heic|webp)[^"'\s<>]*/g;
        const allMatches = html.match(urlRegex) || [];

        const uniquePosts = [...new Set(allMatches)].filter(url => {
            url = url.replace(/\\u0026/g, '&').replace(/\\\//g, '/');
            if (url.includes('static.cdninstagram.com')) return false;
            if (url.includes('/s150x150/') || url.includes('/p50x50/')) return false;
            if (url === metaData.image) return false;
            return true;
        }).slice(0, 12);

        const profile = {
            username: username,
            realName: username,
            bio: metaData.description,
            avatar: metaData.image || 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Default_pfp.svg',
            stats: stats,
            posts: uniquePosts
        };

        // Success Check
        // If we found the profile (stats exist), we return success even if posts are empty.
        // This allows the UI to show the profile header at least.
        if (stats.followers !== '0' || uniquePosts.length > 0) {
            console.log(`[Scraper] Success. Title: ${metaData.title}, Images: ${uniquePosts.length}`);
            res.json(profile);
        } else {
            console.warn('[Scraper] Failed to find profile data.');
            if (html.includes('Login')) throw new Error('Login Wall Detected');
            throw new Error('Profile not found or Private');
        }

    } catch (error) {
        console.error('[Scraper] Error:', error.message);
        console.warn('[Scraper] Activating Mock Data Fallback');

        // Fallback: Generate a believable profile so the UI doesn't crash
        const mockProfile = {
            username: username,
            realName: `${username} (Restricted)`,
            bio: "🔒 This profile is private or the scraper was blocked by Instagram. Showing placeholder content for demonstration.",
            avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`, // Deterministic Avatar
            stats: { followers: '---', following: '---', posts: '---' },
            posts: [
                'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=600&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?q=80&w=600&auto=format&fit=crop'
            ],
            isRestricted: true
        };

        res.json(mockProfile);
    }
});

// Export for Vercel
module.exports = app;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`B.L.A.S.T. Bridge (HTTP Edition) running at http://localhost:${PORT}`);
    });
}
