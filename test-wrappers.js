const https = require('https');

const username = 'iesucafe';
const viewres = [
    { name: 'Dumpor', url: `https://dumpor.com/v/${username}` },
    { name: 'Greatfon', url: `https://greatfon.com/v/${username}` },
    { name: 'InstaNavigation', url: `https://instanavigation.com/user-profile/${username}` },
    { name: 'Picnob', url: `https://www.picnob.com/profile/${username}/` }
];

const options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
    }
};

function checkViewer(site) {
    console.log(`[${site.name}] Fetching ${site.url}...`);
    const req = https.get(site.url, options, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            console.log(`[${site.name}] Status: ${res.statusCode}, Size: ${data.length}`);
            if (res.statusCode === 200) {
                // Heuristic: Look for standard image extensions or specific classes
                const imgCount = (data.match(/<img[^>]+src="[^"]+"[^>]*>/g) || []).length;
                console.log(`[${site.name}] Found ${imgCount} total <img> tags.`);

                // Specific check for profile content
                if (data.includes('iesucafe')) console.log(`[${site.name}] Verified username text found.`);
                else console.log(`[${site.name}] Username text NOT found (might be captcha/block).`);
            } else if (res.statusCode > 300 && res.statusCode < 400) {
                console.log(`[${site.name}] Redirects to: ${res.headers.location}`);
            }
        });
    });
    req.on('error', e => console.log(`[${site.name}] Error: ${e.message}`));
}

viewres.forEach(v => checkViewer(v));
