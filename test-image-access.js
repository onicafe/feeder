// Native fetch (Node 18+)

// One of the URLs the user provided in the logs
const TEST_URL = "https://instagram.fnat1-1.fna.fbcdn.net/v/t51.2885-15/610159846_1532092914755649_5193858162314084958_n.jpg?stp=dst-jpg_e15_tt6&_nc_ht=instagram.fnat1-1.fna.fbcdn.net&_nc_cat=109&_nc_oc=Q6cZ2QF7nLZp_TSBxajvmNRmseKGk4hOeqUIojMTbyOHAmLLsIdXCVFIvV6S1HqEBSGoQmg&_nc_ohc=swoQmfWDCjkQ7kNvwHXcXqO&_nc_gid=PJGllGyTz92JaEL9BI7nAA&edm=AOQ1c0wBAAAA&ccb=7-5&oh=00_AfqmvqhqKdmzsPBB67Y3R2xkHhbSYGNkKGgCAmMCPFZmQQ&oe=697CCA0F&_nc_sid=8b3546";

async function checkImage() {
    console.log("Testing Image Access...");

    try {
        // 1. Plain Request (Simulates <img> tag from localhost)
        const res1 = await fetch(TEST_URL);
        console.log(`\nAttempt 1 (No Headers): ${res1.status} ${res1.statusText}`);

        // 2. Request with Referer Header (Simulates what browser sends)
        // Note: Browsers usually send the origin as referer for img tags.
        const res2 = await fetch(TEST_URL, {
            headers: {
                'Referer': 'http://localhost:3005/'
            }
        });
        console.log(`Attempt 2 (Localhost Referer): ${res2.status} ${res2.statusText}`);

        // 3. Request mimicking Instagram (What we might need to proxy)
        const res3 = await fetch(TEST_URL, {
            headers: {
                'Referer': 'https://www.instagram.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        console.log(`Attempt 3 (Instagram Headers): ${res3.status} ${res3.statusText}`);

    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkImage();
