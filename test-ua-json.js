const https = require('https');
const fs = require('fs');

const username = 'iesucafe';
const url = `https://www.instagram.com/${username}/?__a=1`;

const options = {
    headers: {
        'User-Agent': 'Instagram 250.0.0.21.109 Android (29/10; 420dpi; 1080x2260; samsung; SM-G960F; starlte; samsungexynos9810; en_US; 397184279)',
        'Accept-Language': 'en-US,en;q=0.9',
    }
};

console.log(`Fetching JSON with Mobile UA: ${url}...`);

https.get(url, options, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Location:', res.headers.location);
        console.log('Size:', data.length);

        fs.writeFileSync('debug_mobile_json.html', data);

        if (data.includes('logging in')) console.log('Hit: Login Wall');
        else if (data.startsWith('{')) console.log('Success: JSON received!');
        else console.log('Unknown Content');
    });
});
