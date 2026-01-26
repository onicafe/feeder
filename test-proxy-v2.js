const fs = require('fs');

const username = 'iesucafe';
// Note: corsproxy.io requires the target URL to be appended directly
const targetUrl = `https://www.instagram.com/${username}/`;
const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

const anonyigUrl = `https://anonyig.com/en/profile/${username}/`;

const headers = {
    'User-Agent': 'Instagram 250.0.0.21.109 Android (29/10; 420dpi; 1080x2260; samsung; SM-G960F; starlte; samsungexynos9810; en_US; 397184279)',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
};

async function testFetch(name, url, customHeaders) {
    console.log(`[${name}] Fetching ${url}...`);
    try {
        const res = await fetch(url, { headers: customHeaders, redirect: 'follow' });
        console.log(`[${name}] Status: ${res.status}`);

        const html = await res.text();
        console.log(`[${name}] Size: ${html.length}`);

        fs.writeFileSync(`debug_${name.toLowerCase()}.html`, html);

        if (html.includes('iesucafe')) console.log(`[${name}] "iesucafe" FOUND.`);
        else console.log(`[${name}] "iesucafe" NOT FOUND.`);

        // Check for graph data
        if (html.includes('graphql') || html.includes('edge_owner')) console.log(`[${name}] Graph Data FOUND.`);

    } catch (e) {
        console.log(`[${name}] Error: ${e.message}`);
    }
}

async function run() {
    await testFetch('CorsProxy', proxyUrl, headers);
    // Anonyig might need browser headers, not mobile app headers
    await testFetch('Anonyig', anonyigUrl, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
    });
}

run();
