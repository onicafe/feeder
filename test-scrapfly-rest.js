const fs = require('fs');

const username = 'iesucafe';
const appId = '936619743392459';
const url = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`;

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'x-ig-app-id': appId,
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept': '*/*'
};

console.log(`Fetching ${url}...`);

async function run() {
    try {
        const res = await fetch(url, { headers });
        console.log('Status:', res.status);

        const text = await res.text();
        console.log('Size:', text.length);

        fs.writeFileSync('debug_scrapfly.json', text);

        if (text.includes('user')) {
            console.log('Success! JSON data found.');
            try {
                const json = JSON.parse(text);
                const user = json.data.user;
                console.log('Followers:', user.edge_followed_by.count);
                console.log('Posts:', user.edge_owner_to_timeline_media.count);
                console.log('First 12 Posts available:', user.edge_owner_to_timeline_media.edges.length);
            } catch (e) {
                console.log('Parse Error:', e.message);
            }
        } else {
            console.log('Failed. Response might be HTML (Login Wall).');
        }

    } catch (e) {
        console.log('Error:', e.message);
    }
}

run();
