const { spawn } = require('child_process');

console.log('Starting server...');
const server = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout/stderr
    shell: true
});

let serverOutput = '';

server.stdout.on('data', (data) => {
    const chunk = data.toString();
    serverOutput += chunk;
    console.log(`[Server]: ${chunk.trim()}`);
});

server.stderr.on('data', (data) => {
    console.error(`[Server Error]: ${data.toString().trim()}`);
});

// Wait for server to start
setTimeout(async () => {
    try {
        console.log('Making request to http://127.0.0.1:3005/api/user/iesucafe ...');
        // Use global fetch
        const res = await fetch('http://127.0.0.1:3005/api/user/iesucafe');

        console.log(`Response Status: ${res.status}`);
        const text = await res.text();
        console.log('Response Body Preview:', text.substring(0, 200));

        if (res.ok) {
            try {
                const json = JSON.parse(text);
                if (json.username === 'iesucafe' && !json.bio.includes('Mock User')) {
                    console.log('SUCCESS: Live data retrieved!');
                } else if (json.bio.includes('Mock User')) {
                    console.log('WARNING: Server fell back to Mock Data.');
                } else {
                    console.log('FAILURE: Unexpected response structure.');
                }
            } catch (e) {
                console.log('FAILURE: Response is not JSON.');
            }
        } else {
            console.log('FAILURE: HTTP Error');
        }

    } catch (error) {
        console.error('Test Fetch Error:', error.message);
    } finally {
        console.log('Killing server...');
        // On Windows spawn with shell:true creates a wrapper, so .kill() might just kill the wrapper. 
        // But for a quick test script, we rely on the OS cleaning up or the process exit.
        // We can use taskkill if needed.
        spawn('taskkill', ['/pid', server.pid, '/f', '/t']);
        process.exit(0);
    }
}, 5000);
