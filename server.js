const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3005;

app.use(cors());
app.use(express.static('.')); // Serve static files from current directory

// Validated Web Profile Info Scraper (Scrapfly Strategy)
app.get('/api/user/:username', async (req, res) => {
    const { username } = req.params;
    console.log(`[Scraper] Incoming request for: ${username}`);

    try {
        // Strategy: Use Instagram's internal Web Profile Info API
        // This requires specific headers to mimic a browser request, especially x-ig-app-id
        const targetUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`;

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'x-ig-app-id': '936619743392459', // Critical for this endpoint
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': `https://www.instagram.com/${username}/`,
            'Origin': 'https://www.instagram.com',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Dest': 'empty',
            'X-Requested-With': 'XMLHttpRequest'
        };

        // Add 10s Timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds

        console.log(`[Scraper] Fetching upstream: ${targetUrl}`);

        let response;
        try {
            response = await fetch(targetUrl, {
                headers,
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeoutId);
        }

        console.log(`[Scraper] Upstream status: ${response.status}`);

        if (!response.ok) {
            throw new Error(`Instagram API Error: ${response.status}`);
        }

        const data = await response.json();
        const user = data.data && data.data.user;

        if (!user) {
            throw new Error('User not found in API response');
        }

        // Map API response to our schema
        const profile = {
            username: user.username,
            realName: user.full_name || user.username,
            bio: user.biography,
            avatar: user.profile_pic_url_hd || user.profile_pic_url,
            stats: {
                followers: user.edge_followed_by ? user.edge_followed_by.count.toLocaleString() : '0',
                following: user.edge_follow ? user.edge_follow.count.toLocaleString() : '0',
                posts: user.edge_owner_to_timeline_media ? user.edge_owner_to_timeline_media.count.toLocaleString() : '0'
            },
            posts: (user.edge_owner_to_timeline_media ? user.edge_owner_to_timeline_media.edges : []).map(edge => {
                return edge.node.display_url;
            }).slice(0, 12)
        };

        console.log(`[Scraper] Success. Found ${profile.posts.length} posts.`);
        res.json(profile);

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

// Image Proxy to bypass Hotlink Protection / CORS
app.get('/api/proxy', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send('Missing url param');

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);

        // Forward headers
        res.setHeader('Content-Type', response.headers.get('content-type'));
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24h

        // Pipe the stream
        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));

    } catch (error) {
        console.error('[Proxy Error]', error.message);
        res.status(500).send('Proxy Error');
    }
});

// Export for Vercel
module.exports = app;

if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`B.L.A.S.T. Bridge (HTTP Edition) running at http://localhost:${PORT}`);
    });
}
