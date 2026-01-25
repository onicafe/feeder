const https = require('https');

const username = 'instagram';
const url = `https://www.instagram.com/${username}/`;

const options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'max-age=0'
    }
};

console.log(`Fetching ${url}...`);

https.get(url, options, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);

    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('Body Length:', data.length);
        if (data.includes('logging in')) {
            console.log('Result: LOGIN WALL DETECTED');
        } else if (data.includes('<meta property="og:title"')) {
            console.log('Result: SUCCESS (Found Open Graph Metadata)');
            // Extract some bits
            const match = data.match(/<meta property="og:description" content="([^"]+)"/);
            if (match) console.log('Description:', match[1]);
        } else {
            console.log('Result: UNKNOWN (Check content)');
        }
    });
}).on('error', (e) => {
    console.error(e);
});
