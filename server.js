const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());

// HTTP-based Scraper (Via CORS Proxy to bypass Vercel Block)
app.get('/api/user/:username', async (req, res) => {
    const { username } = req.params;
    console.log(`[Proxy] Fetching for: ${username}`);

    try {
        // Strategy: Use a public CORS proxy that runs server-side (like allorigins)
        // This often bypasses the strict "Datacenter IP" block Instagram puts on Vercel.

        // Target: Instagram Profile (HTML)
        const targetUrl = `https://www.instagram.com/${username}/`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

        const response = await fetch(proxyUrl);

        if (!response.ok) {
            throw new Error(`Proxy Error: ${response.status}`);
        }

        const data = await response.json();
        const html = data.contents; // allorigins returns { contents: "<html>..." }

        if (!html || html.length < 1000) {
            console.warn('[Proxy] Content suspiciously short:', html);
            // If we got a weird response, throw to trigger fallback
            if (html.includes('Login')) throw new Error('Instagram Login Wall (via Proxy)');
        }

        console.log(`[Proxy] Downloaded via AllOrigins: ${html.length} bytes.`);

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

        // 2. Regex Deep Scan for Images (Robust Regex)
        // Challenge: URLs in scripts are escaped (https:\/\/...)
        // We match: http(s) + optional escape + colon + optional escape + slash + ...
        const urlRegex = /https?:\\?\/\\?\/[^"'\s<>]*(?:cdninstagram|scontent|fbcdn)[^"'\s<>]*?(?:jpg|png|heic|webp)[^"'\s<>]*/g;

        const allMatches = html.match(urlRegex) || [];

        const uniquePosts = [...new Set(allMatches)].map(url => {
            // Fix escaped slashes (JSON format -> Normal)
            return url.replace(/\\\//g, '/').replace(/\\u0026/g, '&');
        }).filter(url => {
            // Filter out static assets (emojis, sprites)
            if (url.includes('static.cdninstagram.com')) return false;
            // Filter out tiny thumbnails (s150x150, p50x50) 
            if (url.includes('/s150x150/') || url.includes('/p50x50/')) return false;

            return true;
        });

        // Try to filter pfp
        const pfp = metaData.image;
        const finalPosts = uniquePosts.filter(url => url !== pfp).slice(0, 12);

        // 3. Parse Stats/Bio
        let stats = { followers: '0', following: '0', posts: '0' };
        let bio = '';

        if (metaData.description) {
            const statsMatch = metaData.description.match(/^([0-9.,BKMN]+)\s+Followers,\s+([0-9.,BKMN]+)\s+Following,\s+([0-9.,BKMN]+)\s+Posts/i);
            if (statsMatch) {
                stats.followers = statsMatch[1];
                stats.following = statsMatch[2];
                stats.posts = statsMatch[3];
            }
        }

        const profile = {
            username: username,
            realName: username, // Regex name parsing is flaky, skipping
            bio: metaData.description,
            avatar: pfp || 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Default_pfp.svg',
            stats: stats,
            posts: finalPosts
        };

        if (finalPosts.length === 0) {
            throw new Error('No images found (Login Wall or Private Account)');
        }

        console.log(`[Proxy] Success. Found ${finalPosts.length} images.`);
        res.json(profile);

    } catch (error) {
        console.error('[Proxy] Error:', error.message);
        // Forward error as JSON so frontend can explain it
        res.status(500).json({ error: error.message });
    }
});

// Export for Vercel
module.exports = app;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`B.L.A.S.T. Bridge (HTTP Edition) running at http://localhost:${PORT}`);
    });
}
