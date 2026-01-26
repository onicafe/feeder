const https = require('https');

const username = 'iesucafe';
// DDG Image Search (HTML Version - Lite)
const url = `https://lite.duckduckgo.com/lite/?q=site:instagram.com/${username}&t=h_&iax=images&ia=images`;

const options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/100.0.4896.60',
        'Cookie': 'kl=us-en' // Region check
    }
};

console.log(`Fetching ${url}...`);

https.get(url, options, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Size:', data.length);

        // DDG images are often in 'vqd' params or direct img src in Lite mode
        // In Lite mode, it shows table of images.
        const matches = data.match(/src="[^"]+"/g);
        console.log('Total Images:', matches ? matches.length : 0);
        if (matches) matches.slice(0, 5).forEach(m => console.log(m));

        // Check for Instagram-like URLs? 
        // DDG proxies them usually.
    });
});
