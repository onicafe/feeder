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

            // Check if local to give specific advice
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

            if (isLocal) {
                alert(`Connection Failed: ${error.message}.\n\nTo enable Fetch, you must run the Bridge:\n1. Open Terminal\n2. Run: node server.js`);
            } else {
                alert(`Server Error: ${error.message}.\n\nThe Vercel Function may have crashed or timed out (common with Puppeteer on free tier). Check Vercel logs.`);
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
            'app_title': 'Preview your Grid',
            'app_subtitle': 'Enter an Instagram username to see how their latest posts look with your new content.',
            'input_placeholder': 'instagram',
            'btn_fetch': 'Fetch Grid',
            'how_to_title': 'How to use:',
            'how_to_1': '📸 <strong>Fetch</strong> a public profile to load its last 9 posts.',
            'how_to_2': '📤 <strong>Upload</strong> images to preview them in the grid.',
            'how_to_3': '✨ <strong>Drag & Drop</strong> to rearrange and find the perfect aesthetic.',
            'stat_posts': 'posts',
            'stat_followers': 'followers',
            'stat_following': 'following',
            'footer_copyright': '© 2026 Feeder by',
            'footer_author': 'Iésu Jafé',
            'footer_group': 'Hex Group',
            'ad_text': 'Advertise here for just R$9,90'
        },
        'pt': {
            'app_title': 'Visualize seu Grid',
            'app_subtitle': 'Digite um usuário do Instagram para ver como os posts recentes ficam com seu novo conteúdo.',
            'input_placeholder': 'usuário',
            'btn_fetch': 'Buscar Grid',
            'how_to_title': 'Como usar:',
            'how_to_1': '📸 <strong>Busque</strong> um perfil público para carregar os últimos 9 posts.',
            'how_to_2': '📤 <strong>Carregue</strong> imagens para pré-visualizar no grid.',
            'how_to_3': '✨ <strong>Arraste e Solte</strong> para organizar e encontrar a estética perfeita.',
            'stat_posts': 'publicações',
            'stat_followers': 'seguidores',
            'stat_following': 'seguindo',
            'footer_copyright': '© 2026 Feeder por',
            'footer_author': 'Iésu Jafé',
            'footer_group': 'Hex Group',
            'ad_text': 'Anuncie aqui por apenas R$9,90'
        },
        'ja': {
            'app_title': 'グリッドをプレビュー',
            'app_subtitle': 'Instagramのユーザー名を入力して、最新の投稿が新しいコンテンツとどのように見えるかを確認します。',
            'input_placeholder': 'ユーザーネーム',
            'btn_fetch': 'グリッドを取得',
            'how_to_title': '使い方:',
            'how_to_1': '<strong>取得</strong>: 公開プロフィールから最新の9つの投稿を読み込みます。',
            'how_to_2': '<strong>アップロード</strong>: 画像をアップロードしてグリッドでプレビューします。',
            'how_to_3': '<strong>ドラッグ＆ドロップ</strong>: 並べ替えて、完璧な美しさを見つけます。',
            'stat_posts': '投稿',
            'stat_followers': 'フォロワー',
            'stat_following': 'フォロー中',
            'footer_copyright': '© 2026 Feeder 作成者:',
            'footer_author': 'Iésu Jafé',
            'footer_group': 'Hex Group',
            'ad_text': 'たった R$9,90 でここに広告を出す'
        },
        'zh': {
            'app_title': '预览您的网格',
            'app_subtitle': '输入Instagram用户名，查看其最新帖子与您的新内容的搭配效果。',
            'input_placeholder': '用户名',
            'btn_fetch': '获取网格',
            'how_to_title': '如何使用:',
            'how_to_1': '<strong>获取</strong> 公开资料以加载其最近的9篇帖子。',
            'how_to_2': '<strong>上传</strong> 图片以在网格中预览。',
            'how_to_3': '<strong>拖放</strong> 以重新排列并找到完美的审美。',
            'stat_posts': '帖子',
            'stat_followers': '粉丝',
            'stat_following': '关注',
            'footer_copyright': '© 2026 Feeder 作者',
            'footer_author': 'Iésu Jafé',
            'footer_group': 'Hex Group',
            'ad_text': '仅需 R$9,90 在此广告'
        }
    },

    currentLang: 'en',

    init() {
        this.detectLanguage();
        this.applyTranslations();
    },

    detectLanguage() {
        // 1. Check URL Parameter ?lang=pt
        const urlParams = new URLSearchParams(window.location.search);
        const paramLang = urlParams.get('lang');

        // 2. Check Browser Language
        const browserLang = navigator.language || navigator.userLanguage;
        const shortLang = paramLang || browserLang.split('-')[0]; // 'pt-BR' -> 'pt'

        if (['pt', 'ja', 'zh'].includes(shortLang)) {
            this.currentLang = shortLang;
        } else {
            this.currentLang = 'en'; // Default
        }

        console.log(`[i18n] Detected: ${shortLang} (URL/Nav), Using: ${this.currentLang}`);
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

// --- Protocol 0: Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    RenderEngine.init();
    Tools.init();
    Localization.init(); // Init i18n
});
