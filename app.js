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
    // Helper to proxy images (fixes 403 / CORS)
    getProxyUrl(url) {
        if (!url) return '';
        if (url.startsWith('blob:') || url.startsWith('data:')) return url; // Local uploads don't need proxy

        // Determine API Base
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
        const apiBase = isLocal ? 'http://localhost:3005' : '';

        return `${apiBase}/api/proxy?url=${encodeURIComponent(url)}`;
    },

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
            document.getElementById('profileAvatar').src = this.getProxyUrl(p.avatar);

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
                // Use Proxy for Instagram URLs
                img.src = item.type === 'instagram_fetch' ? this.getProxyUrl(item.url) : item.url;

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
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
            const apiBase = isLocal ? 'http://localhost:3005' : '';

            // Try Local Proxy / Vercel API
            const response = await fetch(`${apiBase}/api/user/${username}`);

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || response.statusText || 'Fetch failed');
            }

            const data = await response.json();
            AppStore.setProfile(data);

            if (data.posts && data.posts.length > 0) {
                AppStore.populateGrid(data.posts);
            } else {
                alert('No posts found or account is Private.');
            }

        } catch (error) {
            console.error('Fetch Failed:', error);
            console.error('Fetch Error:', error);
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';

            if (isLocal) {
                alert(`Local Server Error: Is 'node server.js' running?\n\nDetails: ${error.message}`);
            } else {
                alert('Server Error: Failed to fetch.\n\nThe Vercel Function may have crashed or timed out (common with Puppeteer on free tier). Check Vercel logs.');
            }
        } finally {
            if (btn) {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }
    }
};

// --- Layer 4: Localization (i18n) ---
const Localization = {
    // Dictionary
    translations: {
        'en': {
            'app_title': 'Free Instagram Grid Planner',
            'app_subtitle': 'The visual planner for your Instagram Feed. Preview layout, drag & drop aesthetic, no login required.',
            'input_placeholder': 'instagram username',
            'btn_fetch': 'Load Profile',
            'how_to_title': 'How to plan your feed:',
            'how_to_1': '🔍 <strong>Fetch</strong> a profile to start with your current grid.',
            'how_to_2': '📸 <strong>Upload</strong> photos to preview your future posts.',
            'how_to_3': '✨ <strong>Drag & Drop</strong> to design your perfect aesthetic.',
            'stat_posts': 'posts',
            'stat_followers': 'followers',
            'stat_following': 'following',
            'footer_copyright': '© 2026 Feeder. Made with 🩵 by',
            'footer_author': 'Iésu Jafé'
        },
        'pt': {
            'app_title': 'Planejador de Feed Instagram Grátis',
            'app_subtitle': 'Visualize e organize seu feed do Instagram. Preview de estética, arraste e solte, sem login.',
            'input_placeholder': 'usuário do instagram',
            'btn_fetch': 'Carregar Perfil',
            'how_to_title': 'Como planejar seu feed:',
            'how_to_1': '🔍 <strong>Busque</strong> um perfil para começar com o grid atual.',
            'how_to_2': '📸 <strong>Carregue</strong> fotos para visualizar posts futuros.',
            'how_to_3': '✨ <strong>Arraste e Solte</strong> para criar a estética perfeita.',
            'stat_posts': 'publicações',
            'stat_followers': 'seguidores',
            'stat_following': 'seguindo',
            'footer_copyright': '© 2026 Feeder. Feito com 🩵 por',
            'footer_author': 'Iésu Jafé'
        },
        'ja': {
            'app_title': 'Instagramグリッドプランナー (無料)',
            'app_subtitle': 'Instagramフィードのビジュアルプランナー。レイアウトのプレビュー、ドラッグ＆ドロップ、ログイン不要。',
            'input_placeholder': 'Instagramのユーザー名',
            'btn_fetch': 'プロフィールをロード',
            'how_to_title': 'フィードの計画方法:',
            'how_to_1': '🔍 <strong>取得</strong>: 現在のグリッドから始めます。',
            'how_to_2': '📸 <strong>アップロード</strong>: 投稿予定の写真をプレビューします。',
            'how_to_3': '✨ <strong>ドラッグ＆ドロップ</strong>: 完璧な美しさを見つけましょう。',
            'stat_posts': '投稿',
            'stat_followers': 'フォロワー',
            'stat_following': 'フォロー中',
            'footer_copyright': '© 2026 Feeder. 開発 (🩵):',
            'footer_author': 'Iésu Jafé'
        },
        'zh': {
            'app_title': 'Instagram 网格规划工具 (免费)',
            'app_subtitle': 'Instagram 动态的视觉规划师。预览布局，拖放美学，无需登录。',
            'input_placeholder': 'Instagram 用户名',
            'btn_fetch': '加载个人资料',
            'how_to_title': '如何规划您的动态:',
            'how_to_1': '🔍 <strong>获取</strong> 个人资料以从当前网格开始。',
            'how_to_2': '📸 <strong>上传</strong> 照片以预览未来的帖子。',
            'how_to_3': '✨ <strong>拖放</strong> 以重新排列并设计完美的审美。',
            'stat_posts': '帖子',
            'stat_followers': '粉丝',
            'stat_following': '关注',
            'footer_copyright': '© 2026 Feeder. 制作 (🩵):',
            'footer_author': 'Iésu Jafé'
        }
    },

    currentLang: 'en',

    init() {
        this.detectLanguage();
        this.applyTranslations();
    },

    detectLanguage() {
        // 1. Check URL Parameter (Override): ?lang=pt
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');

        if (urlLang && this.translations[urlLang]) {
            this.currentLang = urlLang;
            console.log(`[i18n] Forced via URL: ${this.currentLang}`);
            return;
        }

        // 2. Check Browser Language
        const browserLang = navigator.language || navigator.userLanguage;
        const shortLang = browserLang.split('-')[0]; // 'pt-BR' -> 'pt'

        if (['pt', 'ja', 'zh'].includes(shortLang)) {
            this.currentLang = shortLang;
        } else {
            this.currentLang = 'en'; // Default
        }

        console.log(`[i18n] Detected: ${browserLang}, Using: ${this.currentLang}`);
    },

    applyTranslations() {
        const dict = this.translations[this.currentLang];
        if (!dict) return;

        // Generic Elements with data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) {
                // If the translation contains HTML tags (like <strong>), use innerHTML
                if (dict[key].includes('<')) {
                    el.innerHTML = dict[key];
                } else {
                    el.textContent = dict[key];
                }
            }
        });

        // Specific placeholders
        const input = document.getElementById('usernameInput');
        if (input && dict['input_placeholder']) {
            input.placeholder = dict['input_placeholder'];
        }
    }
};

// --- Layer 5: Analytics (Privacy-First) ---
const Analytics = {
    init() {
        // Track the visit once per session (reloads count as new hits in this simple version, 
        // to filter reloads requires sessionStorage check, but let's keep it simple for "total usage")
        this.trackVisit();
    },

    async trackVisit() {
        try {
            // No personal data sent, just a ping.
            const response = await fetch('/api/analytics', { method: 'POST' });
            const data = await response.json();
            console.log('[Analytics] Ping:', data);
        } catch (e) {
            console.warn('[Analytics] Failed to ping:', e);
        }
    }
};

// --- Protocol 0: Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    RenderEngine.init();
    Tools.init();
    Analytics.init(); // <--- Start Tracking
    Localization.init(); // Init i18n
});
