const https = require('https');
const fs = require('fs');

const username = 'iesucafe';
const url = `https://www.picuki.com/profile/${username}`;

const options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/100.0.4896.60',
    }
};

function fetchUrl(targetUrl) {
    https.get(targetUrl, options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            console.log(`Redirecting to: ${res.headers.location}`);
            fetchUrl(res.headers.location);
            return;
        }

        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            console.log('Status:', res.statusCode);
            fs.writeFileSync('debug_tikvib.html', data);
            console.log('Saved to debug_tikvib.html');

            // Heuristic Check
            if (data.includes('tikvib')) console.log('Confirmed Tikvib content');
        });
    });
}

fetchUrl(url);
