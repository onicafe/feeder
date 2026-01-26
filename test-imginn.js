const https = require('https');
const fs = require('fs');

const username = 'iesucafe';
const url = `https://imginn.com/${username}/`;

const options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Referer': 'https://imginn.com/'
    }
};

console.log(`Fetching ${url}...`);

https.get(url, options, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        if (res.statusCode === 301 || res.statusCode === 302) {
            console.log('Redirect:', res.headers.location);
        } else {
            fs.writeFileSync('debug_imginn.html', data);
            console.log(`Saved ${data.length} bytes.`);
            const matches = data.match(/\.jpg/g);
            console.log('JPGs found:', matches ? matches.length : 0);
        }
    });
});
