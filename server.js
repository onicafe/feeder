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
            console.warn('[Scraper] Failed to find profile data. Using MOCK fallback.');
            throw new Error('Login Wall Detected');
        }

    } catch (error) {
        console.error('[Scraper] Error:', error.message);
        console.log('[Scraper] Serving high-quality MOCK data for demo purposes.');

        // Mock Data Fallback
        const mockProfile = {
            username: username,
            realName: "Mock User (Demo)",
            bio: "⚠️ Live fetching is blocked by Instagram. Showing demo data.\nSoftware Engineer 💻 | Coffee Lover ☕ | Traveler 🌍",
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
            stats: { followers: '1.2K', following: '450', posts: '12' },
            posts: [
                "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=500&q=80",
                "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=500&q=80",
                "https://images.unsplash.com/photo-1481487484168-9b93099718e5?auto=format&fit=crop&w=500&q=80",
                "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=500&q=80",
                "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=500&q=80",
                "https://images.unsplash.com/photo-1550439062-609e1531270e?auto=format&fit=crop&w=500&q=80",
                "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=500&q=80",
                "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=500&q=80",
                "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=500&q=80",
                "https://images.unsplash.com/photo-1531297461136-82lw9z2x3z4y?auto=format&fit=crop&w=500&q=80",
                "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=500&q=80",
                "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=500&q=80"
            ]
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
