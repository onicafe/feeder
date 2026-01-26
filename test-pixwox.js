const https = require('https');

const username = 'iesucafe';
const url = `https://www.pixwox.com/profile/${username}/`;

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
        if (res.statusCode === 200) {
            const matches = data.match(/<img [^>]*src="([^"]+)"/g);
            console.log('Images found:', matches ? matches.length : 0);
            if (matches) console.log(matches.slice(0, 3));
        } else {
            console.log('Redirect/Error:', res.statusCode);
        }
    });
});
