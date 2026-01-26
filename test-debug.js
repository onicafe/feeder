const https = require('https');
const fs = require('fs');

const username = 'iesucafe'; // User's handle
const url = `https://www.instagram.com/${username}/`;

const options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1'
    }
};

console.log(`Fetching ${url}...`);

const req = https.get(url, options, (res) => {
    console.log('StatusCode:', res.statusCode);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        fs.writeFileSync('debug_insta.html', data);
        console.log(`Saved ${data.length} bytes to debug_insta.html`);

        // Quick Check
        if (data.includes('Login')) console.log('Login detected in text.');

        const imgMatch = data.match(/https:\/\/[^"'\s]+\.jpg/g);
        console.log(`Simple Regex found ${imgMatch ? imgMatch.length : 0} jpgs.`);
    });
});

req.on('error', e => console.error(e));
