const https = require('https');
const fs = require('fs');
const username = 'iesucafe';
const viewres = [
    { name: 'DumporIO', url: `http://dumpor.io/v/${username}/` },
    { name: 'GreatfonIO', url: `http://greatfon.io/v/${username}/` },
];
// Needed to require http module too since we are mixing protocols
const http = require('http');

const options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
    }
};

function checkViewer(site) {
    console.log(`[${site.name}] Fetching ${site.url}...`);
    const protocol = site.url.startsWith('https') ? https : http;

    const req = protocol.get(site.url, options, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            console.log(`[${site.name}] Status: ${res.statusCode}, Size: ${data.length}`);
            if (res.statusCode === 200) {
                fs.writeFileSync(`debug_${site.name}.html`, data);

                const imgCount = (data.match(/<img/g) || []).length;
                console.log(`[${site.name}] Found ${imgCount} total <img> tags.`);

                if (data.includes('iesucafe')) console.log(`[${site.name}] Verified username text found.`);
            } else if (res.statusCode > 300 && res.statusCode < 400) {
                console.log(`[${site.name}] Redirects to: ${res.headers.location}`);
            }
        });
    });
    req.on('error', e => console.log(`[${site.name}] Error: ${e.message}`));
}

viewres.forEach(v => checkViewer(v));
