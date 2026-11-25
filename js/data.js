// data.js — DropFlow (фронтенд-хранилище)
const DF = {
    KEYS: {
        cart: 'df_cart',
        fav: 'df_fav',
        session: 'df_session',
        cookie: 'df_cookie_ok'
    }
};

const DF_DEFAULT_PAGES = {
    about: `<h2>О компании DropFlow</h2><p>DropFlow — это магазин, где каждая вещь отобрана вручную...</p>`,
    privacy: `<h2>Политика конфиденциальности</h2><p>...</p>`,
    'personal-data': `<h2>Согласие на обработку персональных данных</h2><p>...</p>`,
    offer: `<h2>Публичная оферта</h2><p>...</p>`,
    faq: `<h2>Часто спрашивают</h2><p>...</p>`,
    contacts: `<h2>Контакты</h2><p>...</p>`
};

const DF_DEFAULT_SETTINGS = {
    siteName: 'DropFlow',
    tagline: 'ONLINE STORE',
    email: 'artemka.sivyakov2005@gmail.com',
    phone: '+7 (902) 054-34-51',
    address: 'г. Северодвинск, бульвар Строителей, 17',
    tg: '@mirozak',
    legalName: 'Самозанятый Сивяков Артемий Сергеевич',
    inn: '290223956586'
};

const Store = {
    // локальное (localStorage)
    _get(key, def) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : def;
        } catch (e) { return def; }
    },
    _set(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
    },
    _remove(key) { localStorage.removeItem(key); },

    // серверное (кэш в памяти)
    _settings: null,
    _pages: null,

    init() {
        this.refreshServerData();
    },

    async refreshServerData() {
        try {
            const [settings, pages] = await Promise.all([
                fetch('/api/settings').then(r => r.ok ? r.json() : {}),
                fetch('/api/pages').then(r => r.ok ? r.json() : {})
            ]);
            this._settings = Object.assign({}, DF_DEFAULT_SETTINGS, settings || {});
            this._pages = Object.assign({}, DF_DEFAULT_PAGES, pages || {});
        } catch (e) {
            console.warn('Сервер недоступен, использую дефолтные настройки');
            this._settings = DF_DEFAULT_SETTINGS;
            this._pages = DF_DEFAULT_PAGES;
        }
    },

    getSettings() { return this._settings || DF_DEFAULT_SETTINGS; },

    async saveSettings(settings) {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, this.authHeaders()),
            body: JSON.stringify(settings)
        });
        const data = await res.json();
        if (data.success) await this.refreshServerData();
        return data;
    },

    getPages() { return this._pages || DF_DEFAULT_PAGES; },

    async savePage(key, content) {
        const res = await fetch('/api/pages', {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, this.authHeaders()),
            body: JSON.stringify({ key, content })
        });
        const data = await res.json();
        if (data.success) await this.refreshServerData();
        return data;
    },

    // Корзина
    getCart() { return this._get(DF.KEYS.cart, []); },
    setCart(c) { return this._set(DF.KEYS.cart, c); },

    // Избранное
    getFav() { return this._get(DF.KEYS.fav, []); },
    setFav(f) { return this._set(DF.KEYS.fav, f); },

    // Сессия (теперь хранит токен с сервера)
    getSession() { return this._get(DF.KEYS.session, null); },
    setSession(s) { return this._set(DF.KEYS.session, s); },
    clearSession() { this._remove(DF.KEYS.session); },

    // Заголовки авторизации для запросов к API
    authHeaders() {
        const s = this.getSession();
        return s && s.token ? { 'Authorization': 'Bearer ' + s.token } : {};
    },

    getCookieOk() { return localStorage.getItem(DF.KEYS.cookie) === '1'; },
    setCookieOk() { localStorage.setItem(DF.KEYS.cookie, '1'); }
};

const DFUtil = {
    formatPrice(n) { return Number(n || 0).toLocaleString('ru-RU') + ' ₽'; },
    formatDate(iso) {
        const d = new Date(iso);
        const pad = n => String(n).padStart(2, '0');
        return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },
    escapeHtml(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },
    stars(rating) {
        const r = Math.round(Number(rating) || 0);
        return '★'.repeat(r) + '☆'.repeat(5 - r);
    },
    toast(message, type = 'info', ms = 3000) {
        const box = document.getElementById('toastBox');
        if (!box) return alert(message);
        const el = document.createElement('div');
        el.className = 'toast ' + type;
        el.textContent = message;
        box.appendChild(el);
        setTimeout(() => { el.classList.add('hide'); setTimeout(() => el.remove(), 300); }, ms);
    }
};

Store.init();
