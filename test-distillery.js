const https = require('https');
const fs = require('fs');

const username = 'iesucafe';
const url = `https://www.instagram.com/${username}/?__d=dis`;

const options = {
    headers: {
        'User-Agent': 'Instagram 250.0.0.21.109 Android (29/10; 420dpi; 1080x2260; samsung; SM-G960F; starlte; samsungexynos9810; en_US; 397184279)',
        'Accept-Language': 'en-US,en;q=0.9',
    }
};

console.log(`Fetching Distillery: ${url}...`);

https.get(url, options, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Size:', data.length);
        if (data.includes('edge_owner_to_timeline_media')) console.log('Found Graph Data!');
        else console.log('No Graph Data');
    });
});
