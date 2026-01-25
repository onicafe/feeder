/**
 * Resonant Cosmos | B.L.A.S.T. Architecture
 * Layer 2: Navigation (App Logic) & Layer 3: Tools (Helpers)
 */

// --- Layer 1: Data / State (Store) ---
const AppStore = {
    state: {
        profile: {
            username: null,
            avatarUrl: null,
            followers: null,
            fetched: false
        },
        grid: Array.from({ length: 9 }).map((_, i) => ({
            id: crypto.randomUUID(),
            type: 'empty',
            url: null,
            file: null
        }))
    },

    // Action: Update Grid Item
    updateGridItem(index, type, url, file = null) {
        if (index < 0 || index >= 9) return;
        this.state.grid[index] = {
            ...this.state.grid[index],
            type,
            url,
            file
        };
        RenderEngine.renderGrid();
    },

    // Action: Add New Post (Shift array right)
    addPost(file) {
        const url = URL.createObjectURL(file);

        // Remove last item, add new item at start
        this.state.grid.pop();
        this.state.grid.unshift({
            id: crypto.randomUUID(),
            type: 'local_upload',
            url: url,
            file: file
        });

        RenderEngine.renderGrid();
    },

    // Action: Swap Items (Drag & Drop)
    swapItems(fromIndex, toIndex) {
        const grid = this.state.grid;
        [grid[fromIndex], grid[toIndex]] = [grid[toIndex], grid[fromIndex]];
        this.saveState();
        RenderEngine.renderGrid();
    },

    // Action: Set Profile
    setProfile(data) {
        this.state.profile = { ...data, fetched: true };
        this.saveState();
        RenderEngine.renderProfile();
    },

    // Action: Populate Grid from Fetch
    populateGrid(imageUrls) {
        // "Infinite" Grid support: Use the number of images returned, or 9 (whichever is greater)
        // This allows the user to see everything we fetched.
        // Requested Update: Show only a 3x3 grid (9 items)
        const gridLength = 9;
        const slicedUrls = imageUrls.slice(0, 9);

        const newGrid = Array.from({ length: gridLength }).map((_, i) => {
            const url = slicedUrls[i] || null;
            return {
                id: crypto.randomUUID(),
                type: url ? 'instagram_fetch' : 'empty',
                url: url,
                file: null
            };
        });

        this.state.grid = newGrid;
        this.saveState();
        RenderEngine.renderGrid();
    },

    // Persistence Layer
    saveState() {
        try {
            // Clean grid: Local uploads (Blobs) cannot be saved easily.
            // We strip them to avoid errors.
            const cleanGrid = this.state.grid.map(item => {
                if (item.type === 'local_upload') {
                    return { ...item, url: null, file: null, type: 'empty' };
                }
                return item;
            });

            const payload = {
                profile: this.state.profile,
                grid: cleanGrid
            };

            localStorage.setItem('feeder_state_v1', JSON.stringify(payload));
        } catch (e) {
            console.warn('Failed to save state:', e);
        }
    },

    loadState() {
        try {
            const raw = localStorage.getItem('feeder_state_v1');
            if (raw) {
                const data = JSON.parse(raw);
                if (data.profile) this.state.profile = data.profile;
                if (data.grid) {
                    this.state.grid = data.grid.map(item => ({ ...item, file: null }));
                }
                RenderEngine.renderProfile();
                RenderEngine.renderGrid();
            }
        } catch (e) {
            console.warn('Failed to load state:', e);
        }
    },

    // Multiple Post Upload
    addPosts(files) {
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            const url = URL.createObjectURL(file);
            this.state.grid.pop();
            this.state.grid.unshift({
                id: crypto.randomUUID(),
                type: 'local_upload',
                url: url,
                file: file
            });
        });

        RenderEngine.renderGrid();
    }
};

// --- Layer 2: Navigation / Logic (Render Engine) ---
const RenderEngine = {
    init() {
        this.gridEl = document.getElementById('gridContainer');
        this.profileEl = document.getElementById('profileSection');

        // Load persist
        AppStore.loadState();

        // If grid is empty after load (or just initialized), render default
        if (!this.gridEl.innerHTML) {
            this.renderGrid();
        }
    },

    renderProfile() {
        const p = AppStore.state.profile;
        if (p.fetched) {
            this.profileEl.classList.remove('hidden');

            this.profileEl.scrollIntoView({ behavior: 'smooth' });

            // Text
            document.getElementById('profileRealName').textContent = p.realName || p.username;
            document.getElementById('profileHandle').textContent = `@${p.username}`;
            document.getElementById('profileBio').textContent = p.bio || '';

            // Image
            document.getElementById('profileAvatar').src = p.avatar;

            // Stats
            if (p.stats) {
                document.getElementById('statPosts').textContent = p.stats.posts;
                document.getElementById('statFollowers').textContent = p.stats.followers;
                document.getElementById('statFollowing').textContent = p.stats.following;
            }
        }
    },

    renderGrid() {
        this.gridEl.innerHTML = '';
        AppStore.state.grid.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = 'grid-item';
            el.draggable = true;
            el.dataset.index = index;

            if (item.type !== 'empty' && item.url) {
                const img = document.createElement('img');
                img.src = item.url;

                // Error Handling
                img.onerror = function () {
                    // Placeholder for broken images
                    this.parentElement.style.backgroundColor = '#f0f0f0';
                    this.parentElement.innerHTML = '<span style="opacity:0.2;">N/A</span>';
                };

                el.appendChild(img);
            } else {
                el.style.display = 'flex';
                el.style.alignItems = 'center';
                el.style.justifyContent = 'center';
                el.textContent = index + 1; // Placeholder number
            }

            // Drag Events
            this.attachDragEvents(el, index);

            this.gridEl.appendChild(el);
        });
    },

    attachDragEvents(el, index) {
        el.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', index);
            el.classList.add('dragging');
        });

        el.addEventListener('dragend', () => {
            el.classList.remove('dragging');
        });

        el.addEventListener('dragover', (e) => {
            e.preventDefault(); // Allow drop
        });

        el.addEventListener('drop', (e) => {
            e.preventDefault();
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = index;
            if (fromIndex !== toIndex) {
                AppStore.swapItems(fromIndex, toIndex);
            }
        });
    }
};

// --- Layer 3: Tools (Input Handling & Fetch) ---
// --- Layer 3: Tools (Input Handling & Fetch) ---
const Tools = {
    init() {
        // 1. File Upload
        const fileBtn = document.getElementById('uploadBtn');
        const fileInput = document.getElementById('fileInput');

        if (fileBtn && fileInput) {
            fileBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    AppStore.addPosts(e.target.files);
                    fileInput.value = '';
                }
            });
        }

        // 2. Fetch
        const fetchBtn = document.getElementById('fetchBtn');
        if (fetchBtn) {
            fetchBtn.addEventListener('click', () => {
                const username = document.getElementById('usernameInput').value;
                if (username) this.fetchInstagram(username);
            });
        }

        // 3. Enter Key for Search
        const usernameInput = document.getElementById('usernameInput');
        if (usernameInput) {
            usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const username = e.target.value;
                    if (username) this.fetchInstagram(username);
                }
            });
        }

        // 4. Theme Toggle
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            // Set Initial State
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.body.setAttribute('data-theme', savedTheme);

            // Icon Logic
            const moon = themeBtn.querySelector('.icon-moon');
            const sun = themeBtn.querySelector('.icon-sun');

            const updateIcons = (theme) => {
                if (theme === 'dark') {
                    if (moon) moon.classList.add('hidden');
                    if (sun) sun.classList.remove('hidden');
                } else {
                    if (moon) moon.classList.remove('hidden');
                    if (sun) sun.classList.add('hidden');
                }
            };

            updateIcons(savedTheme);

            themeBtn.addEventListener('click', () => {
                const isDark = document.body.getAttribute('data-theme') === 'dark';
                const newTheme = isDark ? 'light' : 'dark';
                document.body.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                updateIcons(newTheme);
            });
        }

        // 5. Grid Ratio Toggle
        const btnSquare = document.getElementById('ratioSquare');
        const btnPortrait = document.getElementById('ratioPortrait');
        const grid = document.getElementById('gridContainer');

        if (btnSquare && btnPortrait && grid) {
            btnSquare.addEventListener('click', () => {
                grid.classList.remove('ratio-4-5');
                btnSquare.classList.add('active');
                btnPortrait.classList.remove('active');
            });

            btnPortrait.addEventListener('click', () => {
                grid.classList.add('ratio-4-5');
                btnPortrait.classList.add('active');
                btnSquare.classList.remove('active');
            });
        }
    },

    async fetchInstagram(username) {
        const btn = document.getElementById('fetchBtn');
        const originalText = btn ? btn.textContent : 'Fetch';
        if (btn) {
            btn.textContent = 'Linking...';
            btn.disabled = true;
        }

        try {
            // Determine API URL
            // If running locally (VS Code Live Server or similar), use localhost:3000
            // If deployed (Vercel), use relative path /api/...
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const apiBase = isLocal ? 'http://localhost:3000' : '';

            // Try Local Proxy / Vercel API
            const response = await fetch(`${apiBase}/api/user/${username}`);

            if (!response.ok) throw new Error('Proxy unreachable or User not found');

            const data = await response.json();

            // Pass full data object to updated setProfile
            AppStore.setProfile(data);

            if (data.posts && data.posts.length > 0) {
                AppStore.populateGrid(data.posts);
            } else {
                alert('No posts found or account is Private.');
            }

        } catch (error) {
            console.warn('Link Connection Failed:', error);
            // Fallback to Mock if Proxy isn't running, but warn user
            if (username.toLowerCase() === 'instagram') {
                AppStore.setProfile({
                    username: 'instagram',
                    realName: 'Instagram',
                    bio: 'Making the world closer.',
                    avatar: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/2048px-Instagram_logo_2016.svg.png',
                    stats: { followers: '699M', following: '50', posts: '10k' }
                });
                alert('Used MOCK data. To get real data, run "node server.js" in your terminal.');
            } else {
                alert(`Connection Failed: ${error.message}.\n\nTo enable Fetch, you must run the Bridge:\n1. Open Terminal\n2. Run: node server.js`);
            }
        } finally {
            if (btn) {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }
    }
};

// --- Protocol 0: Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    RenderEngine.init();
    Tools.init();
});
