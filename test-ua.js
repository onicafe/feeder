const https = require('https');
const fs = require('fs');

const username = 'iesucafe';
const url = `https://www.instagram.com/${username}/`;

const options = {
    headers: {
        // Mobile UA (PostAddictMe)
        'User-Agent': 'Instagram 250.0.0.21.109 Android (29/10; 420dpi; 1080x2260; samsung; SM-G960F; starlte; samsungexynos9810; en_US; 397184279)',
        'Accept-Language': 'en-US,en;q=0.9',
    }
};

console.log(`Fetching with Mobile UA: ${url}...`);

https.get(url, options, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Size:', data.length);
        if (data.includes('logging in')) console.log('Hit: Login Wall');
        else console.log('Clean response?');

        if (data.startsWith('{')) console.log('It is JSON!');
        fs.writeFileSync('debug_mobile.html', data);
        console.log('Saved to debug_mobile.html');
    });
});
