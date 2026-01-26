const https = require('https');
const fs = require('fs');

const username = 'iesucafe';
const targetUrl = `https://www.instagram.com/${username}/`;
const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

console.log(`Fetching via Proxy: ${proxyUrl}...`);

https.get(proxyUrl, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
            const json = JSON.parse(data);
            const html = json.contents;
            console.log(`HTML Length: ${html.length}`);
            fs.writeFileSync('debug_proxy.html', html);
            console.log('Saved to debug_proxy.html');

            // Heuristics
            if (html.includes('Login • Instagram')) console.log('Hit: Login Title');
            if (html.includes('logging in')) console.log('Hit: "logging in" text');
            if (html.includes('csrf_token')) console.log('Hit: csrf_token found');
            if (html.includes('edge_owner_to_timeline_media')) console.log('Hit: Graph Data found!');

        } catch (e) {
            console.error('Parse Error:', e);
            console.log('Raw Data snippet:', data.substring(0, 200));
        }
    });
});
