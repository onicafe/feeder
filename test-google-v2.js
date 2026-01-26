const https = require('https');
const fs = require('fs');

const username = 'iesucafe';
const url = `https://webcache.googleusercontent.com/search?q=cache:https://www.instagram.com/${username}/`;

const options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/100.0.4896.60'
    }
};

console.log(`Fetching ${url}...`);

https.get(url, options, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Size:', data.length);
        fs.writeFileSync('debug_google.html', data);

        // Quick check
        if (data.includes('shortcode')) console.log('Found "shortcode" in cache!');
        else console.log('No shortcodes found.');
    });
});
