const DF = {
    KEYS: {
        settings: 'df_settings',
        users: 'df_users',
        orders: 'df_orders',
        promos: 'df_promos',
        cart: 'df_cart',
        fav: 'df_fav',
        session: 'df_session',
        cookie: 'df_cookie_ok'
    }
};

const DF_DEFAULT_PAGES = {
    about: `<h2>О компании DropFlow</h2><p>DropFlow — это магазин, где каждая вещь отобрана вручную...</p>`,
    privacy: `<h2>Политика конфиденциальности</h2><p>...</p>`,
    'personal-data': `<h2>Согласие на обработку...</h2><p>...</p>`,
    offer: `<h2>Публичная оферта</h2><p>...</p>`
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

const DF_DEFAULT_PROMOS = [
    { code: 'WELCOME10', type: 'percent', value: 10, minTotal: 0 },
    { code: 'FLOW500', type: 'fixed', value: 500, minTotal: 3000 }
];

const Store = {
    _get(key, def) {
        try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : def; } catch (e) { return def; }
    },
    _set(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
    },
    _remove(key) { localStorage.removeItem(key); },

    init() {
        if (!localStorage.getItem(DF.KEYS.pages)) this._set(DF.KEYS.pages, DF_DEFAULT_PAGES);
        if (!localStorage.getItem(DF.KEYS.settings)) this._set(DF.KEYS.settings, DF_DEFAULT_SETTINGS);
        if (!localStorage.getItem(DF.KEYS.promos)) this._set(DF.KEYS.promos, DF_DEFAULT_PROMOS);
    },

    getPages() { return this._get(DF.KEYS.pages, {}); },
    setPages(p) { return this._set(DF.KEYS.pages, p); },
    getSettings() { return this._get(DF.KEYS.settings, DF_DEFAULT_SETTINGS); },
    setSettings(s) { return this._set(DF.KEYS.settings, s); },
    getPromos() { return this._get(DF.KEYS.promos, []); },
    setPromos(list) { return this._set(DF.KEYS.promos, list); },
    getCart() { return this._get(DF.KEYS.cart, []); },
    setCart(c) { return this._set(DF.KEYS.cart, c); },
    getFav() { return this._get(DF.KEYS.fav, []); },
    setFav(f) { return this._set(DF.KEYS.fav, f); },
    getSession() { return this._get(DF.KEYS.session, null); },
    setSession(s) { return this._set(DF.KEYS.session, s); },
    clearSession() { this._remove(DF.KEYS.session); },
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