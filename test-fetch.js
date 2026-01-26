const fs = require('fs');

const username = 'iesucafe';
const targets = [
    { name: 'Imginn', url: `https://imginn.com/${username}/` },
    { name: 'Dumpor', url: `https://dumpor.io/v/${username}` },
    { name: 'Greatfon', url: `https://greatfon.io/v/${username}` },
    { name: 'SearchUsers', url: `https://www.searchusers.com/user/${username}` }
];

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://www.google.com/'
};

async function testAll() {
    for (const t of targets) {
        console.log(`[${t.name}] Fetching ${t.url}...`);
        try {
            const res = await fetch(t.url, { headers, redirect: 'follow' });
            console.log(`[${t.name}] Status: ${res.status}`);
            console.log(`[${t.name}] Final URL: ${res.url}`);

            const html = await res.text();
            console.log(`[${t.name}] Size: ${html.length}`);

            fs.writeFileSync(`debug_fetch_${t.name.toLowerCase()}.html`, html);

            const imgCount = (html.match(/<img/g) || []).length;
            console.log(`[${t.name}] Img Tags: ${imgCount}`);

            if (html.includes('iesucafe')) console.log(`[${t.name}] Text "iesucafe" FOUND.`);
            else console.log(`[${t.name}] Text "iesucafe" NOT FOUND.`);

        } catch (e) {
            console.log(`[${t.name}] Error: ${e.message}`);
        }
        console.log('---');
    }
}

testAll();
