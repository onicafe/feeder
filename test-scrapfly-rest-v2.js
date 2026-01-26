const fs = require('fs');

const username = 'iesucafe';
const appId = '936619743392459';
const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`;

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'x-ig-app-id': appId,
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept': '*/*',
    'Referer': 'https://www.instagram.com/' + username + '/',
    'Origin': 'https://www.instagram.com',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
    'X-Requested-With': 'XMLHttpRequest' // Sometimes critical for AJAX
};

console.log(`Fetching ${url}...`);

async function run() {
    try {
        const res = await fetch(url, { headers });
        console.log('Status:', res.status);

        const text = await res.text();
        console.log('Size:', text.length);
        console.log('Preview:', text.substring(0, 100)); // Show start of response

        fs.writeFileSync('debug_scrapfly_v2.html', text);

    } catch (e) {
        console.log('Error:', e.message);
    }
}

run();
