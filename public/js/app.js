/* ============================================================
   DropFlow — app.js
   Клиентская логика магазина: каталог, корзина, избранное,
   оформление, личный кабинет, страницы из подвала.
   Зависимости: data.js (Store, DFUtil, PAGES), auth.js (Auth)
   ============================================================ */

'use strict';

const $ = id => document.getElementById(id);
const esc = s => DFUtil.escapeHtml ? DFUtil.escapeHtml(s) : String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const price = v => DFUtil.formatPrice(v);

// Текущее состояние страницы
const state = {
    products: [],
    categories: [],
    settings: {},
    page: 1,
    perPage: 12,
    totalPages: 1,
    search: '',
    category: 'all',
    pickupPoints: [],
    promo: null
};

// ============================================================
// УВЕДОМЛЕНИЯ
// ============================================================
function toast(text, type = '') {
    const box = $('toastBox');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = text;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3200);
}

// ============================================================
// ШАПКА: СЧЁТЧИКИ, КНОПКА ВХОДА, МЕНЮ
// ============================================================
function updateBadges() {
    const cart = Store.getCart();
    const fav = Store.getFav();
    const cartCount = $('cartCount');
    const favCount = $('favCount');
    if (cartCount) cartCount.textContent = cart.reduce((s, i) => s + i.quantity, 0);
    if (favCount) favCount.textContent = fav.length;
}

function updateAuthButton() {
    const el = $('authBtnText');
    if (!el) return;
    
    if (Auth.isLoggedIn()) {
        const u = Auth.current();
        if (u.role === 'admin') {
            el.textContent = 'Админка';
        } else {
            el.textContent = u.login || 'Профиль';
        }
    } else {
        el.textContent = 'Войти';
    }
}

function toggleCart(open) {
    $('cartPanel').classList.toggle('open', open);
    $('cartOverlay').classList.toggle('active', open);
    if (open) renderCart();
}

function toggleFav(open) {
    $('favPanel').classList.toggle('open', open);
    $('cartOverlay').classList.toggle('active', open);
    if (open) renderFavPanel();
}

// ============================================================
// КАТАЛОГ
// ============================================================
async function loadCatalog() {
    try {
        const [prodRes, catRes] = await Promise.all([
            fetch('/api/products').then(r => r.json()),
            fetch('/api/categories').then(r => r.json())
        ]);
        state.products = Array.isArray(prodRes) ? prodRes.filter(p => !p.hidden) : [];
        state.categories = Array.isArray(catRes) ? catRes : [];
        renderCategoryFilter();
        renderProducts();
    } catch (e) {
        console.error('Ошибка загрузки каталога:', e);
        toast('Не удалось загрузить каталог', 'error');
    }
}

function renderCategoryFilter() {
    const sel = $('categoryFilter');
    if (!sel) return;
    sel.innerHTML = '<option value="all">Все товары</option>' +
        state.categories.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('');
}

function filteredProducts() {
    const q = state.search.trim().toLowerCase();
    return state.products.filter(p => {
        const matchCat = state.category === 'all' || p.category === state.category;
        const matchQ = !q || (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
        return matchCat && matchQ;
    });
}

function renderProducts() {
    const grid = $('productsGrid');
    if (!grid) return;
    const list = filteredProducts();
    state.totalPages = Math.max(1, Math.ceil(list.length / state.perPage));
    if (state.page > state.totalPages) state.page = 1;

    const slice = list.slice((state.page - 1) * state.perPage, state.page * state.perPage);
    const fav = Store.getFav();

    grid.innerHTML = slice.map(p => {
        const inFav = fav.includes(p.id);
        const oldPrice = p.old_price && p.old_price > p.price
            ? `<s>${price(p.old_price)}</s>` : '';
        const badge = p.old_price && p.old_price > p.price
            ? `<span class="product-badge">СКИДКА</span>` : '';
        return `
        <article class="product-card" data-id="${p.id}">
            <div class="product-img-wrap">
                ${badge}
                <img class="product-img" src="${esc(p.image || 'images/placeholder.png')}" alt="${esc(p.name)}" loading="lazy">
                <button class="product-fav" data-action="fav" title="В избранное">
                    <img src="images/${inFav ? 'heart-full.png' : 'heart-empty.png'}" alt="${inFav ? 'Убрать из избранного' : 'В избранное'}">
                </button>
                <button class="quick-view-btn" data-action="quickview">Быстрый просмотр</button>
            </div>
            <div class="product-info">
                <span class="product-category">${esc(p.category || '')}</span>
                <h3 class="product-name">${esc(p.name)}</h3>
                <div class="product-price">${price(p.price)} ${oldPrice}</div>
                <div class="product-actions">
                    <button class="btn-accent" data-action="add">В корзину</button>
                </div>
            </div>
        </article>`;
    }).join('');

    renderPagination();
    const noRes = $('noResults');
    if (noRes) noRes.hidden = list.length > 0;
    updateBadges();
}

function renderPagination() {
    const box = $('pagination');
    if (!box) return;
    if (state.totalPages <= 1) { box.innerHTML = ''; return; }
    let html = '';
    for (let i = 1; i <= state.totalPages; i++) {
        html += `<button class="page-btn ${i === state.page ? 'active' : ''}" data-page-num="${i}">${i}</button>`;
    }
    box.innerHTML = html;
}

function resetFilters() {
    state.search = '';
    state.category = 'all';
    state.page = 1;
    $('searchInput').value = '';
    $('categoryFilter').value = 'all';
    renderProducts();
}

// ============================================================
// БАННЕР РЕКЛАМЫ
// ============================================================
function renderBanner() {
    const box = $('catalogBanner');
    if (!box) return;
    const img = state.settings.bannerImage;
    box.innerHTML = img ? `<div class="catalog-banner"><img src="${esc(img)}" alt="Акция"></div>` : '';
}

// ============================================================
// ИЗБРАННОЕ
// ============================================================
function toggleFavorite(id, btn) {
    const fav = Store.getFav();
    const idx = fav.indexOf(id);
    if (idx >= 0) {
        fav.splice(idx, 1);
        toast('Убрано из избранного');
    } else {
        fav.push(id);
        toast('Добавлено в избранное', 'success');
    }
    Store.setFav(fav);
    updateBadges();

    const img = btn ? btn.querySelector('img') : null;
    if (img) img.src = 'images/' + (fav.includes(id) ? 'heart-full.png' : 'heart-empty.png');
    if ($('favPanel') && $('favPanel').classList.contains('open')) renderFavPanel();
    if ($('quickViewModal') && $('quickViewModal').classList.contains('open')) openQuickView(id);
}

function renderFavPanel() {
    const box = $('favItems');
    if (!box) return;
    const fav = Store.getFav();
    const items = state.products.filter(p => fav.includes(p.id));

    if (!items.length) {
        box.innerHTML = '<div class="cart-empty">В избранном пока пусто.<br>Нажмите на сердце у товара.</div>';
        return;
    }
    box.innerHTML = items.map(p => `
        <div class="cart-item">
            <img src="${esc(p.image || 'images/placeholder.png')}" alt="">
            <div class="cart-item-info">
                <span class="cart-item-name">${esc(p.name)}</span>
                <span class="cart-item-price">${price(p.price)}</span>
                <button class="btn-accent" style="margin-top:6px;" data-fav-add="${p.id}">В корзину</button>
            </div>
            <button class="cart-item-remove" data-fav-remove="${p.id}" title="Убрать">×</button>
        </div>`).join('');
}

// ============================================================
// КОРЗИНА
// ============================================================
function cartTotals() {
    const cart = Store.getCart();
    const items = cart.reduce((s, i) => s + i.quantity, 0);
    const total = cart.reduce((s, i) => s + i.quantity * i.price, 0);
    const discount = state.promo ? Math.round(total * state.promo.value / 100) : 0;
    return { items, total, discount, payable: Math.max(0, total - discount) };
}

function renderCart() {
    const box = $('cartItems');
    if (!box) return;
    const cart = Store.getCart();

    if (!cart.length) {
        box.innerHTML = '<div class="cart-empty">Корзина пуста</div>';
    } else {
        box.innerHTML = cart.map((i, idx) => `
            <div class="cart-item" data-idx="${idx}">
                <img src="${esc(i.image || 'images/placeholder.png')}" alt="">
                <div class="cart-item-info">
                    <span class="cart-item-name">${esc(i.name)}</span>
                    <span class="cart-item-price">${price(i.price)}</span>
                    <div class="qty-control">
                        <button data-cart="dec">−</button>
                        <span>${i.quantity}</span>
                        <button data-cart="inc">+</button>
                    </div>
                </div>
                <button class="cart-item-remove" data-cart="remove" title="Убрать">×</button>
            </div>`).join('');
    }

    const t = cartTotals();
    $('totalItems').textContent = t.items;
    $('totalDiscount').textContent = '−' + price(t.discount);
    $('totalPrice').textContent = price(t.payable);
    $('checkoutBtn').disabled = !cart.length;
}

function changeQty(idx, delta) {
    const cart = Store.getCart();
    if (!cart[idx]) return;
    cart[idx].quantity += delta;
    if (cart[idx].quantity <= 0) cart.splice(idx, 1);
    Store.setCart(cart);
    renderCart();
    updateBadges();
}

async function applyPromo() {
    const code = $('promoInput').value.trim();
    const msg = $('promoMessage');
    if (!code) { msg.textContent = 'Введите промокод'; msg.className = 'promo-message error'; return; }

    try {
        const res = await fetch('/api/promo/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, subtotal: cartTotals().total })
        });
        const data = await res.json();
        if (data.success) {
            state.promo = data.promo;
            msg.textContent = `Промокод применён: −${price(data.discount)}`;
            msg.className = 'promo-message ok';
        } else {
            state.promo = null;
            msg.textContent = data.error || 'Промокод не найден';
            msg.className = 'promo-message error';
        }
    } catch (e) {
        msg.textContent = 'Ошибка проверки промокода';
        msg.className = 'promo-message error';
    }
    renderCart();
}

// ============================================================
// БЫСТРЫЙ ПРОСМОТР
// ============================================================
function openQuickView(id) {
    const p = state.products.find(x => x.id === id);
    if (!p) return;
    const inFav = Store.getFav().includes(p.id);
    $('quickViewBody').innerHTML = `
        <div class="quick-view-body">
            <img src="${esc(p.image || 'images/placeholder.png')}" alt="${esc(p.name)}">
            <div class="quick-view-info">
                <span class="product-category">${esc(p.category || '')}</span>
                <h2 style="color:#fff;">${esc(p.name)}</h2>
                <div class="product-price" style="font-size:24px;">${price(p.price)}</div>
                <p style="color:var(--text-2); font-size:14px;">${esc(p.description || '')}</p>
                <div style="display:flex; gap:10px; margin-top:10px;">
                    <button class="btn-accent" data-qv-add="${p.id}">В корзину</button>
                    <button class="product-fav" style="position:static; width:44px; height:44px;" data-action="fav" data-id="${p.id}">
                        <img src="images/${inFav ? 'heart-full.png' : 'heart-empty.png'}" alt="В избранное">
                    </button>
                </div>
            </div>
        </div>`;
    $('quickViewModal').classList.add('open');
}

// ============================================================
// СТРАНИЦЫ ИЗ ПОДВАЛА
// ============================================================
let faqListenerAttached = false;

function openPage(key) {
    const pages = Store.getPages();
    let page = pages[key] || '';
    
    // Контакты
    if (key === 'contacts') {
        const s = state.settings;
        page = `<p><b>Компания:</b> ${esc(s.legalName || '')}</p>
                <p><b>ИНН:</b> ${esc(s.inn || '')}</p>
                <p><b>Email:</b> ${esc(s.email || '')}</p>
                <p><b>Телефон:</b> ${esc(s.phone || '')}</p>
                <p><b>Адрес:</b> ${esc(s.address || '')}</p>`;
    }

    const titles = {
        about: 'О нас',
        delivery: 'Доставка и оплата',
        faq: 'Часто спрашивают',
        offer: 'Публичная оферта',
        privacy: 'Политика конфиденциальности',
        'personal-data': 'Обработка персональных данных',
        contacts: 'Контакты'
    };
    const title = titles[key] || key;

    $('pageBody').innerHTML = `<h2 class="modal-title" style="margin-bottom:20px;">${title}</h2><div style="color:var(--text-2); font-size:14px; line-height:1.7;">${page}</div>`;
    
    // Настраиваем аккордеон только для FAQ
    if (key === 'faq' && !faqListenerAttached) {
        $('pageBody').addEventListener('click', (e) => {
            const btn = e.target.closest('.faq-q');
            if (btn) btn.parentElement.classList.toggle('open');
        });
        faqListenerAttached = true;
    }

    $('pageModal').classList.add('open');
}

// ============================================================
// ПУНКТЫ ВЫДАЧИ СДЭК
// ============================================================
let selectedPickup = null;

async function loadPickupPoints() {
    if (state.pickupPoints.length) return;
    try {
        const res = await fetch('/api/pickup');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        // Поддерживаем оба формата: массив или { points: [...] }
        state.pickupPoints = Array.isArray(data) ? data : (data.points || []);
        console.log('Пункты выдачи загружены:', state.pickupPoints.length, state.pickupPoints);
    } catch (e) {
        console.error('Не удалось загрузить пункты выдачи:', e);
        toast('Не удалось загрузить пункты выдачи', 'error');
    }
}

function renderPickupList(filter = '') {
    const box = $('pickupPointsList');
    if (!box) return;
    const q = filter.trim().toLowerCase();
    const list = state.pickupPoints.filter(p =>
        !q || (p.city || '').toLowerCase().includes(q) || (p.address || '').toLowerCase().includes(q));

    box.innerHTML = list.length ? list.map(p => `
        <div class="order-card" style="display:flex; justify-content:space-between; align-items:center; gap:10px; cursor:pointer;" data-pickup="${p.id}">
            <div>
                <b style="color:#fff; font-size:14px;">${esc(p.city)}, ${esc(p.address)}</b>
            </div>
            <span style="color:var(--accent); font-size:13px; white-space:nowrap;">Выбрать</span>
        </div>`).join('')
        : '<div class="cart-empty">Ничего не найдено</div>';
}

function selectPickup(id) {
    selectedPickup = state.pickupPoints.find(p => String(p.id) === String(id));
    if (!selectedPickup) return;
    $('pickupIdInput').value = selectedPickup.id;
    $('pickupSelected').textContent = `Выбрано: ${selectedPickup.city}, ${selectedPickup.address}`;
    $('pickupModal').classList.remove('open');
}

// ============================================================
// ОФОРМЛЕНИЕ ЗАКАЗА
// ============================================================
function openCheckout() {
    if (!Auth.isLoggedIn()) {
        toast('Войдите в аккаунт, чтобы оформить заказ', 'error');
        toggleCart(false);
        window.location.href = 'login.html';
        return;
    }
    const user = Auth.current();
    const form = $('checkoutForm');
    form.querySelector('[name=name]').value = user?.name || '';
    form.querySelector('[name=phone]').value = user?.phone || '';
    form.querySelector('[name=email]').value = user?.email || '';

    const t = cartTotals();
    $('checkoutTotal').textContent = price(t.payable);
    $('checkoutModal').classList.add('open');
    toggleCart(false);
}

async function submitOrder() {
    const form = $('checkoutForm');
    if (!form.reportValidity()) return;

    const cart = Store.getCart();
    if (!cart.length) { toast('Корзина пуста', 'error'); return; }

    if ($('deliveryType').value === 'pickup' && !selectedPickup) {
        toast('Выберите пункт выдачи', 'error');
        return;
    }

    const fd = new FormData(form);
    const btn = $('payBtn');
    btn.disabled = true;
    btn.textContent = 'Создаём заказ...';

    try {
        const orderRes = await fetch('/api/order', {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, Store.authHeaders()),
            body: JSON.stringify({
                name: fd.get('name'),
                phone: fd.get('phone'),
                email: fd.get('email'),
                address: fd.get('deliveryType') === 'pickup'
                    ? `ПВЗ СДЭК: ${selectedPickup.city}, ${selectedPickup.address} (ID ${selectedPickup.id})`
                    : fd.get('address'),
                comment: fd.get('comment'),
                items: cart,
                promoCode: state.promo ? state.promo.code : null
            })
        });
        const orderData = await orderRes.json();
        if (!orderData.success) {
            toast(orderData.error || 'Ошибка оформления заказа', 'error');
            btn.disabled = false;
            btn.textContent = 'Перейти к оплате';
            return;
        }

        const orderId = orderData.orderId;
        btn.textContent = 'Открываем оплату...';

        const payRes = await fetch('/api/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId })
        });
        const payData = await payRes.json();

        if (payData.success && payData.confirmation_url) {
            window.location.href = payData.confirmation_url;
        } else {
            Store.setCart([]);
            state.promo = null;
            updateBadges();
            $('checkoutModal').classList.remove('open');
            window.location.href = 'payment.html?orderId=' + orderId;
        }
    } catch (e) {
        console.error('Ошибка:', e);
        toast('Не удалось связаться с сервером', 'error');
        btn.disabled = false;
        btn.textContent = 'Перейти к оплате';
    }
}

// ============================================================
// ЛИЧНЫЙ КАБИНЕТ
// ============================================================
function switchProfileTab(tab) {
    document.querySelectorAll('#profileModal .tab').forEach(b =>
        b.classList.toggle('active', b.dataset.profileTab === tab));
    $('profileOrders').style.display = tab === 'orders' ? 'block' : 'none';
    $('profileData').style.display = tab === 'data' ? 'block' : 'none';
    $('profileReview').style.display = tab === 'review' ? 'block' : 'none';

    if (tab === 'orders') loadMyOrders();
    if (tab === 'data') fillProfileData();
    if (tab === 'review') fillReviewProducts();
}

async function loadMyOrders() {
    const box = $('myOrdersList');
    box.innerHTML = '<p>Загрузка...</p>';
    try {
        const res = await fetch('/api/orders/my', { headers: Store.authHeaders() });
        if (res.status === 401) { box.innerHTML = '<p>Войдите заново</p>'; return; }
        const orders = await res.json();
        if (!orders.length) {
            box.innerHTML = '<p style="color:var(--text-2);">Заказов пока нет. Оформите первый!</p>';
            return;
        }
        const labels = { paid: 'Оплачен', pending: 'Ожидает оплаты', canceled: 'Отменён' };
        const statusLabels = { active: 'Оформлен', shipped: 'Передан в доставку', delivering: 'Доставляется', arrived: 'Приехал', done: 'Завершён', canceled: 'Отменён' };
        box.innerHTML = orders.map(o => `
            <div class="order-card">
                <h4>Заказ №${o.id} · ${price(o.total)}</h4>
                <div style="color:var(--text-3); font-size:12px;">${new Date(o.createdAt || o.created_at).toLocaleDateString('ru-RU')}</div>
                <div class="order-status ${o.payment_status}">${labels[o.payment_status] || o.payment_status} · ${statusLabels[o.status] || o.status}</div>
                <a href="payment.html?orderId=${o.id}" style="color:var(--accent); font-size:13px;">Страница оплаты →</a>
            </div>`).join('');
    } catch (e) {
        box.innerHTML = '<p style="color:var(--danger);">Не удалось загрузить заказы</p>';
    }
}

function fillProfileData() {
    const u = Auth.current() || {};
    $('profName').value = u.name || '';
    $('profLogin').value = u.login || '';
    $('profEmail').value = u.email || '';
    $('profPhone').value = u.phone || '';
}

async function fillReviewProducts() {
    const sel = $('reviewProduct');
    if (!sel) return;
    sel.innerHTML = state.products.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
}

async function submitReview() {
    const text = $('reviewText').value.trim();
    if (text.length < 3) { toast('Отзыв слишком короткий', 'error'); return; }
    const res = await fetch('/api/comments', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, Store.authHeaders()),
        body: JSON.stringify({ productId: $('reviewProduct').value, text })
    });
    const data = await res.json();
    if (data.success) {
        toast('Спасибо! Отзыв отправлен на проверку', 'success');
        $('reviewText').value = '';
    } else {
        toast(data.error || 'Не удалось отправить отзыв', 'error');
    }
}

// ============================================================
// НАСТРОЙКИ САЙТА
// ============================================================
async function loadSettings() {
    try {
        const res = await fetch('/api/settings').then(r => r.json());
        state.settings = res || {};

        if (state.settings.heroImage) {
            const hero = document.querySelector('.hero');
            if (hero) hero.style.backgroundImage = `url('${state.settings.heroImage}')`;
        }
        const fc = $('footerContacts');
        if (fc) fc.innerHTML = `${esc(state.settings.legalName || '')}<br>ИНН ${esc(state.settings.inn || '')}<br>${esc(state.settings.email || '')} · ${esc(state.settings.phone || '')}`;

        renderBanner();
    } catch (e) {}
}

// ============================================================
// ПЕЧАТНАЯ МАШИНКА
// ============================================================
const TYPE_PHRASES = ['уютнее', 'комфортнее', 'живее', 'теплее', 'роднее'];

function startTypewriter() {
    const el = $('typewriterText');
    if (!el) return;
    let phrase = 0, char = 0, deleting = false;

    (function tick() {
        const text = TYPE_PHRASES[phrase];
        el.textContent = text.slice(0, char);

        let delay = deleting ? 50 : 100;
        if (!deleting && char === text.length) { delay = 2000; deleting = true; }
        else if (deleting && char === 0) { deleting = false; phrase = (phrase + 1) % TYPE_PHRASES.length; delay = 500; }
        else char += deleting ? -1 : 1;

        setTimeout(tick, delay);
    })();
}

// ============================================================
// КНОПКА «НАВЕРХ»
// ============================================================
function initToTop() {
    const btn = $('toTop');
    if (!btn) return;
    window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 400));
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ============================================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================================
function bindEvents() {
    // Шапка
    $('cartBtn')?.addEventListener('click', () => toggleCart(true));
    $('favBtn')?.addEventListener('click', () => toggleFav(true));
    $('closeCartBtn')?.addEventListener('click', () => toggleCart(false));
    $('closeFavBtn')?.addEventListener('click', () => toggleFav(false));
    $('cartOverlay')?.addEventListener('click', () => { toggleCart(false); toggleFav(false); });

    $('authBtn')?.addEventListener('click', () => {
        if (Auth.isLoggedIn()) {
            if (Auth.isAdmin()) {
                window.location.href = 'admin.html';
            } else {
                $('profileModal').classList.add('open');
                switchProfileTab('orders');
            }
        } else {
            window.location.href = 'login.html';
        }
    });

    $('burgerBtn')?.addEventListener('click', () => $('mobileMenu').classList.toggle('open'));

    // Ссылки на страницы
    document.addEventListener('click', e => {
        const link = e.target.closest('[data-page]');
        if (link) {
            e.preventDefault();
            openPage(link.dataset.page);
        }
    });

    // Фильтры
    $('searchInput')?.addEventListener('input', e => { state.search = e.target.value; state.page = 1; renderProducts(); });
    $('categoryFilter')?.addEventListener('change', e => { state.category = e.target.value; state.page = 1; renderProducts(); });
    $('resetFilters')?.addEventListener('click', resetFilters);
    $('noResultsReset')?.addEventListener('click', resetFilters);

    // Пагинация
    $('pagination')?.addEventListener('click', e => {
        const btn = e.target.closest('[data-page-num]');
        if (btn) {
            state.page = Number(btn.dataset.pageNum);
            renderProducts();
            document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
        }
    });

    // Карточки товаров
    $('productsGrid')?.addEventListener('click', e => {
        const card = e.target.closest('.product-card');
        if (!card) return;
        const id = Number(card.dataset.id);
        const action = e.target.closest('[data-action]')?.dataset.action;

        if (e.target.closest('[data-action="fav"]')) { toggleFavorite(id, e.target.closest('.product-fav')); return; }
        if (action === 'add') {
            const p = state.products.find(x => x.id === id);
            if (p) {
                const cart = Store.getCart();
                const existing = cart.find(i => i.id === p.id);
                if (existing) existing.quantity += 1;
                else cart.push({ id: p.id, name: p.name, price: p.price, image: p.image, quantity: 1 });
                Store.setCart(cart);
                updateBadges();
                toast('Добавлено в корзину', 'success');
            }
            return;
        }
        if (action === 'quickview') openQuickView(id);
    });

    // Быстрый просмотр
    $('closeQuickView')?.addEventListener('click', () => $('quickViewModal').classList.remove('open'));
    $('quickViewModal')?.addEventListener('click', e => {
        if (e.target === $('quickViewModal')) $('quickViewModal').classList.remove('open');
        const add = e.target.closest('[data-qv-add]');
        if (add) {
            const p = state.products.find(x => x.id === Number(add.dataset.qvAdd));
            if (p) {
                const cart = Store.getCart();
                const existing = cart.find(i => i.id === p.id);
                if (existing) existing.quantity += 1;
                else cart.push({ id: p.id, name: p.name, price: p.price, image: p.image, quantity: 1 });
                Store.setCart(cart);
                updateBadges();
                toast('Добавлено в корзину', 'success');
            }
        }
        const fav = e.target.closest('[data-action="fav"][data-id]');
        if (fav) toggleFavorite(Number(fav.dataset.id), fav);
    });

    // Корзина
    $('cartItems')?.addEventListener('click', e => {
        const item = e.target.closest('.cart-item');
        if (!item) return;
        const idx = Number(item.dataset.idx);
        const act = e.target.dataset.cart;
        if (act === 'inc') changeQty(idx, 1);
        if (act === 'dec') changeQty(idx, -1);
        if (act === 'remove') changeQty(idx, -999);
    });

    $('applyPromoBtn')?.addEventListener('click', applyPromo);
    $('checkoutBtn')?.addEventListener('click', openCheckout);

    // Оформление
    $('closeCheckout')?.addEventListener('click', () => $('checkoutModal').classList.remove('open'));
    $('checkoutModal')?.addEventListener('click', e => { if (e.target === $('checkoutModal')) $('checkoutModal').classList.remove('open'); });
    $('payBtn')?.addEventListener('click', submitOrder);

    $('deliveryType')?.addEventListener('change', e => {
        const isPickup = e.target.value === 'pickup';
        $('pickupRow').style.display = isPickup ? 'flex' : 'none';
        $('addressRow').style.display = isPickup ? 'none' : 'block';
    });

    // Пункты выдачи
    $('pickPickupBtn')?.addEventListener('click', async () => {
        await loadPickupPoints();
        renderPickupList();
        $('pickupSearch').value = '';
        $('pickupModal').classList.add('open');
    });
    $('pickupSearch')?.addEventListener('input', e => renderPickupList(e.target.value));
    $('pickupPointsList')?.addEventListener('click', e => {
        const row = e.target.closest('[data-pickup]');
        if (row) selectPickup(row.dataset.pickup);
    });

    // Закрытие модалки пунктов выдачи: крестик и клик по тёмному фону
    $('pickupModal')?.addEventListener('click', e => {
        if (e.target === $('pickupModal') || e.target.closest('[data-close], .close-btn')) {
            $('pickupModal').classList.remove('open');
        }
    });

    // Избранное
    $('favItems')?.addEventListener('click', e => {
        const add = e.target.closest('[data-fav-add]');
        if (add) {
            const p = state.products.find(x => x.id === Number(add.dataset.favAdd));
            if (p) {
                const cart = Store.getCart();
                const existing = cart.find(i => i.id === p.id);
                if (existing) existing.quantity += 1;
                else cart.push({ id: p.id, name: p.name, price: p.price, image: p.image, quantity: 1 });
                Store.setCart(cart);
                updateBadges();
                toast('Добавлено в корзину', 'success');
            }
        }
        const rm = e.target.closest('[data-fav-remove]');
        if (rm) {
            Store.setFav(Store.getFav().filter(id => id !== Number(rm.dataset.favRemove)));
            updateBadges();
            renderFavPanel();
            renderProducts();
        }
    });

    // Страницы
    $('closePage')?.addEventListener('click', () => $('pageModal').classList.remove('open'));
    $('pageModal')?.addEventListener('click', e => { if (e.target === $('pageModal')) $('pageModal').classList.remove('open'); });

    // Личный кабинет
    $('closeProfile')?.addEventListener('click', () => $('profileModal').classList.remove('open'));
    $('profileModal')?.addEventListener('click', e => { if (e.target === $('profileModal')) $('profileModal').classList.remove('open'); });
    document.querySelectorAll('[data-profile-tab]').forEach(btn =>
        btn.addEventListener('click', () => switchProfileTab(btn.dataset.profileTab)));

    // Выход из аккаунта с кастомным подтверждением
    $('logoutFromProfile')?.addEventListener('click', () => {
        $('profileModal').classList.remove('open');
        $('confirmModal').classList.add('open');
    });

    $('confirmYes')?.addEventListener('click', () => {
        Auth.logout();
        updateAuthButton();
        $('confirmModal').classList.remove('open');
        toast('Вы вышли из аккаунта');
    });

    $('confirmNo')?.addEventListener('click', () => {
        $('confirmModal').classList.remove('open');
    });

    $('confirmModal')?.addEventListener('click', e => {
        if (e.target === $('confirmModal')) $('confirmModal').classList.remove('open');
    });

    $('reviewSubmit')?.addEventListener('click', submitReview);
}

// ============================================================
// СТАРТ
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    updateBadges();
    updateAuthButton();
    initToTop();
    startTypewriter();
    await loadSettings();
    await loadCatalog();
});
