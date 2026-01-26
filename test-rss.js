const https = require('https');

const username = 'iesucafe';
const url = `https://rsshub.app/instagram/user/${username}`;

console.log(`Fetching RSS: ${url}...`);

https.get(url, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        console.log('Status:', res.statusCode);

        if (res.statusCode === 200) {
            console.log('Size:', data.length);
            const matches = data.match(/<img src="([^"]+)"/g);
            console.log('Images found:', matches ? matches.length : 0);
            if (matches) console.log(matches[0]);
        } else {
            console.log('Snippet:', data.substring(0, 200));
        }
    });
});
