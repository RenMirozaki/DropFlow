document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('.hero')) return;

    const grid = document.getElementById('productsGrid');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const noResults = document.getElementById('noResults');
    const resetFilters = document.getElementById('resetFilters');
    const cartBtn = document.getElementById('cartBtn');
    const cartPanel = document.getElementById('cartPanel');
    const cartOverlay = document.getElementById('cartOverlay');
    const closeCartBtn = document.getElementById('closeCartBtn');
    const favBtn = document.getElementById('favBtn');
    const favPanel = document.getElementById('favPanel');
    const closeFavBtn = document.getElementById('closeFavBtn');
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const totalItems = document.getElementById('totalItems');
    const totalPrice = document.getElementById('totalPrice');
    const totalDiscount = document.getElementById('totalDiscount');
    const promoInput = document.getElementById('promoInput');
    const applyPromoBtn = document.getElementById('applyPromoBtn');
    const promoMessage = document.getElementById('promoMessage');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const checkoutModal = document.getElementById('checkoutModal');
    const checkoutForm = document.getElementById('checkoutForm');
    const closeCheckout = document.getElementById('closeCheckout');
    const quickViewModal = document.getElementById('quickViewModal');
    const quickViewBody = document.getElementById('quickViewBody');
    const closeQuickView = document.getElementById('closeQuickView');
    const pageModal = document.getElementById('pageModal');
    const pageBody = document.getElementById('pageBody');
    const closePage = document.getElementById('closePage');
    const profileModal = document.getElementById('profileModal');
    const closeProfile = document.getElementById('closeProfile');
    const logoutFromProfile = document.getElementById('logoutFromProfile');
    const authBtn = document.getElementById('authBtn');
    const authBtnText = document.getElementById('authBtnText');
    const favItems = document.getElementById('favItems');
    const favCount = document.getElementById('favCount');
    const toTop = document.getElementById('toTop');
    const payBtn = document.getElementById('payBtn');

    let allProducts = [];
    let cart = Store.getCart();
    let fav = Store.getFav();
    let appliedPromo = null;

    init();

    async function init() {
        await loadProducts();
        await renderCategories();
        renderProducts();
        updateCartUI();
        updateFavUI();
        updateAuthUI();
        startTypewriter();
        initProfileTabs();
        renderBanner();
    }

    async function loadProducts() {
        try {
            const res = await fetch('/api/products');
            allProducts = await res.json();
        } catch (e) {
            console.error('Ошибка загрузки товаров', e);
            allProducts = [];
        }
    }

    function renderBanner() {
        const banner = document.getElementById('catalogBanner');
        if (!banner) return;
        banner.innerHTML = `
            <div style="background: linear-gradient(135deg, var(--bg-2), var(--bg-3)); padding: 25px; text-align: center; border: 1px solid var(--accent); margin-bottom: 30px;">
                <h3 style="color: var(--accent); margin-bottom: 10px; font-size: 24px;">🔥 Акция!</h3>
                <p style="color: var(--text); font-size: 16px;">Скидка 10% на первый заказ по промокоду <b>WELCOME10</b></p>
            </div>
        `;
    }

    async function renderCategories() {
        if (!categoryFilter) return;
        try {
            const res = await fetch('/api/categories');
            const cats = await res.json();
            categoryFilter.innerHTML = '<option value="all">Все товары</option>' + cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        } catch (e) {
            categoryFilter.innerHTML = '<option value="all">Все товары</option>';
        }
    }

    function renderProducts() {
        if (!grid) return;
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const category = categoryFilter ? categoryFilter.value : 'all';

        let list = allProducts.filter(p => {
            if (p.hidden) return false;
            const mSearch = p.name.toLowerCase().includes(query) || (p.description || '').toLowerCase().includes(query);
            const mCat = category === 'all' || p.category === category;
            return mSearch && mCat;
        });

        if (list.length === 0) {
            grid.innerHTML = '';
            if (noResults) noResults.hidden = false;
            return;
        }
        if (noResults) noResults.hidden = true;
        grid.innerHTML = list.map(productCardHTML).join('');
        bindCardEvents();
    }

    function productCardHTML(p) {
        const isFav = fav.includes(p.id);
        const hasOld = p.old_price && p.old_price > p.price;
        const discount = hasOld ? Math.round((1 - p.price / p.old_price) * 100) : 0;
        return `
            <div class="product-card" data-id="${p.id}">
                <div class="product-media">
                    <img src="${DFUtil.escapeHtml(p.image)}" alt="${DFUtil.escapeHtml(p.name)}" onerror="this.onerror=null;this.src='https://via.placeholder.com/400x400/1a2f26/e8b06a?text=DropFlow';">
                    <div class="product-badges">
                        ${hasOld ? `<span class="p-badge sale">-${discount}%</span>` : ''}
                        ${p.popular ? `<span class="p-badge new">TOP</span>` : ''}
                    </div>
                    <button class="fav-btn ${isFav ? 'active' : ''}" data-fav="${p.id}">♥</button>
                    <button class="quick-view-btn" data-quick="${p.id}">Быстрый просмотр</button>
                </div>
                <div class="product-info">
                    <span class="product-category">${DFUtil.escapeHtml(p.category)}</span>
                    <h3 class="product-name">${DFUtil.escapeHtml(p.name)}</h3>
                    <div class="product-rating"><span class="stars">${DFUtil.stars(p.rating)}</span></div>
                    <div class="product-price-row">
                        <span class="product-price">${DFUtil.formatPrice(p.price)}</span>
                        ${hasOld ? `<span class="product-old-price">${DFUtil.formatPrice(p.old_price)}</span>` : ''}
                    </div>
                    <div class="product-actions">
                        <button class="btn-accent" data-add="${p.id}">В корзину</button>
                    </div>
                </div>
            </div>
        `;
    }

    function bindCardEvents() {
        grid.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', e => { 
            e.stopPropagation(); 
            addToCart(Number(b.dataset.add)); 
        }));
        grid.querySelectorAll('[data-fav]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); toggleFav(Number(b.dataset.fav)); }));
        grid.querySelectorAll('[data-quick]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openQuickView(Number(b.dataset.quick)); }));
    }

    if (searchInput) searchInput.addEventListener('input', renderProducts);
    if (categoryFilter) categoryFilter.addEventListener('change', renderProducts);
    if (resetFilters) resetFilters.addEventListener('click', () => { searchInput.value = ''; categoryFilter.value = 'all'; renderProducts(); });

    function addToCart(id) {
        const p = allProducts.find(x => x.id === id);
        if (!p) return;
        const existing = cart.find(i => i.id === id);
        if (existing) existing.quantity += 1;
        else cart.push({ id: p.id, name: p.name, price: p.price, image: p.image, quantity: 1 });
        Store.setCart(cart);
        updateCartUI();
        DFUtil.toast(`«${p.name}» добавлен в корзину`, 'success', 2000);
    }

    function removeFromCart(id) { cart = cart.filter(i => i.id !== id); Store.setCart(cart); updateCartUI(); }
    function changeQty(id, delta) { const item = cart.find(i => i.id === id); if (!item) return; item.quantity += delta; if (item.quantity <= 0) { removeFromCart(id); return; } Store.setCart(cart); updateCartUI(); }

    function updateCartUI() {
        if (!cartCount) return;
        const count = cart.reduce((s, i) => s + i.quantity, 0);
        cartCount.textContent = count;
        if (cart.length === 0) { cartItems.innerHTML = '<div class="empty-cart">Корзина пуста</div>'; if (checkoutBtn) checkoutBtn.disabled = true; }
        else {
            cartItems.innerHTML = cart.map(i => `
                <div class="cart-item">
                    <img src="${DFUtil.escapeHtml(i.image)}" alt="${DFUtil.escapeHtml(i.name)}">
                    <div class="cart-item-info">
                        <h4>${DFUtil.escapeHtml(i.name)}</h4>
                        <p>${DFUtil.formatPrice(i.price)}</p>
                        <div class="qty-control">
                            <button data-qty="${i.id}" data-delta="-1">−</button>
                            <span>${i.quantity}</span>
                            <button data-qty="${i.id}" data-delta="1">+</button>
                        </div>
                    </div>
                    <div class="cart-item-actions"><button class="remove-btn" data-remove="${i.id}">Удалить</button></div>
                </div>
            `).join('');
            if (checkoutBtn) checkoutBtn.disabled = false;
        }
        cartItems.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => removeFromCart(Number(b.dataset.remove))));
        cartItems.querySelectorAll('[data-qty]').forEach(b => b.addEventListener('click', () => changeQty(Number(b.dataset.qty), Number(b.dataset.delta))));

        if (totalItems) totalItems.textContent = count;
        const sub = cart.reduce((s, i) => s + i.price * i.quantity, 0);
        let discount = 0;
        if (appliedPromo) { if (appliedPromo.type === 'percent') discount = Math.round(sub * appliedPromo.value / 100); else discount = Math.min(appliedPromo.value, sub); }
        if (totalDiscount) totalDiscount.textContent = DFUtil.formatPrice(discount);
        if (totalPrice) totalPrice.textContent = DFUtil.formatPrice(Math.max(0, sub - discount));
    }

    function openCart() { if (cartPanel) cartPanel.classList.add('open'); if (cartOverlay) cartOverlay.classList.add('active'); }
    function closeCart() { if (cartPanel) cartPanel.classList.remove('open'); if (favPanel) favPanel.classList.remove('open'); if (cartOverlay) cartOverlay.classList.remove('active'); }
    
    if (cartBtn) cartBtn.addEventListener('click', openCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

    if (applyPromoBtn) {
        applyPromoBtn.addEventListener('click', () => {
            if (!promoInput) return;
            const code = promoInput.value.trim().toUpperCase();
            const promos = Store.getPromos();
            const promo = promos.find(p => p.code.toUpperCase() === code);
            if (!promo) { promoMessage.textContent = 'Промокод не найден'; promoMessage.className = 'promo-message err'; return; }
            appliedPromo = promo;
            updateCartUI();
            promoMessage.textContent = 'Промокод применён';
            promoMessage.className = 'promo-message ok';
        });
    }

    function toggleFav(id) {
        const idx = fav.indexOf(id);
        if (idx === -1) { fav.push(id); DFUtil.toast('Добавлено в избранное', 'success', 1800); }
        else { fav.splice(idx, 1); }
        Store.setFav(fav);
        updateFavUI();
        renderProducts();
    }

    function updateFavUI() {
        if (!favCount) return;
        favCount.textContent = fav.length;
        if (fav.length === 0) { favItems.innerHTML = '<div class="empty-cart">В избранном пусто</div>'; return; }
        const list = allProducts.filter(p => fav.includes(p.id));
        favItems.innerHTML = list.map(p => `
            <div class="cart-item">
                <img src="${DFUtil.escapeHtml(p.image)}" alt="${DFUtil.escapeHtml(p.name)}">
                <div class="cart-item-info"><h4>${DFUtil.escapeHtml(p.name)}</h4><p>${DFUtil.formatPrice(p.price)}</p></div>
                <div class="cart-item-actions">
                    <button class="btn-accent" data-fav-add="${p.id}">В корзину</button>
                    <button class="remove-btn" data-fav-remove="${p.id}">Убрать</button>
                </div>
            </div>
        `).join('');
        favItems.querySelectorAll('[data-fav-add]').forEach(b => b.addEventListener('click', () => addToCart(Number(b.dataset.favAdd))));
        favItems.querySelectorAll('[data-fav-remove]').forEach(b => b.addEventListener('click', () => toggleFav(Number(b.dataset.favRemove))));
    }

    if (favBtn) favBtn.addEventListener('click', () => { if(favPanel) favPanel.classList.add('open'); if(cartOverlay) cartOverlay.classList.add('active'); });
    if (closeFavBtn) closeFavBtn.addEventListener('click', closeCart);

    function openQuickView(id) {
        const p = allProducts.find(x => x.id === id);
        if (!p || !quickViewBody) return;
        const hasOld = p.old_price && p.old_price > p.price;
        quickViewBody.innerHTML = `
            <div class="qv-grid">
                <div class="qv-image"><img src="${DFUtil.escapeHtml(p.image)}" alt="${DFUtil.escapeHtml(p.name)}"></div>
                <div class="qv-info">
                    <h2>${DFUtil.escapeHtml(p.name)}</h2>
                    <div class="qv-price">${DFUtil.formatPrice(p.price)} ${hasOld ? `<span style="color:var(--text-3);font-size:16px;text-decoration:line-through;">${DFUtil.formatPrice(p.old_price)}</span>` : ''}</div>
                    <p class="qv-desc">${DFUtil.escapeHtml(p.description || '')}</p>
                    <div class="qv-actions">
                        <button class="btn-accent big" data-qv-add="${p.id}">В корзину</button>
                    </div>
                </div>
            </div>
        `;
        quickViewBody.querySelector('[data-qv-add]').addEventListener('click', () => { addToCart(p.id); quickViewModal.classList.remove('open'); });
        quickViewModal.classList.add('open');
    }
    if (closeQuickView) closeQuickView.addEventListener('click', () => quickViewModal.classList.remove('open'));

    if (checkoutBtn) checkoutBtn.addEventListener('click', () => { if (cart.length === 0) return; closeCart(); checkoutModal.classList.add('open'); });
    if (closeCheckout) closeCheckout.addEventListener('click', () => checkoutModal.classList.remove('open'));


    if (payBtn) {
        payBtn.addEventListener('click', async () => {
            if (!checkoutForm.checkValidity()) { checkoutForm.reportValidity(); return; }
            
            const sub = cart.reduce((s, i) => s + i.price * i.quantity, 0);
            let discount = 0;
            if (appliedPromo) discount = appliedPromo.type === 'percent' ? Math.round(sub * appliedPromo.value / 100) : Math.min(appliedPromo.value, sub);
            const total = Math.max(0, sub - discount);

            try {
                // Отправляем запрос на сервер для создания платежа
                const response = await fetch('/api/pay', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: total, orderId: Date.now() }) // orderId можно заменить на реальный ID заказа
                });
                const data = await response.json();

                if (data.success && data.confirmation_url) {
                    // Перенаправляем на страницу оплаты ЮKassa
                    window.location.href = data.confirmation_url;
                } else {
                    alert('Ошибка при создании платежа. Попробуйте позже.');
                }
            } catch (e) {
                console.error('Ошибка:', e);
                alert('Не удалось связаться с сервером.');
            }
        });
    }
    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const key = link.dataset.page;
            const pages = Store.getPages();
            let html = '';
            if (key === 'contacts') {
                const s = Store.getSettings();
                html = `<h2>Контакты</h2><p><b>Email:</b> ${s.email}</p><p><b>Телефон:</b> ${s.phone}</p><p><b>Адрес:</b> ${s.address}</p>`;
            } else if (key === 'faq') {
                html = `<h2>Часто спрашивают</h2><div class="faq-list">
                    <div class="faq-item"><button class="faq-q">Как оформить заказ?</button><div class="faq-a">Добавьте товары в корзину...</div></div>
                    <div class="faq-item"><button class="faq-q">Сколько стоит доставка?</button><div class="faq-a">Доставка по России через СДЭК — от 350 ₽.</div></div>
                </div>`;
            } else {
                html = pages[key] || '<p>Страница не найдена</p>';
            }
            pageBody.innerHTML = html;
            pageModal.classList.add('open');
            pageBody.querySelectorAll('.faq-q').forEach(btn => btn.addEventListener('click', () => btn.parentElement.classList.toggle('open')));
        });
    });
    if (closePage) closePage.addEventListener('click', () => pageModal.classList.remove('open'));

    function updateAuthUI() {
        if (!authBtn) return;
        if (Auth.isLoggedIn()) {
            const u = Auth.current();
            authBtnText.textContent = u.login;
            if (u.role === 'admin') authBtn.onclick = () => window.location.href = 'admin.html';
            else authBtn.onclick = () => { profileModal.classList.add('open'); loadProfileData(); };
        } else {
            authBtnText.textContent = 'Войти';
            authBtn.onclick = () => window.location.href = 'login.html';
        }
    }

    function initProfileTabs() {
        if (closeProfile) closeProfile.addEventListener('click', () => profileModal.classList.remove('open'));
        document.querySelectorAll('[data-profile-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('[data-profile-tab]').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const target = tab.dataset.profileTab;
                document.querySelectorAll('.profile-tab-content').forEach(c => c.style.display = 'none');
                document.getElementById('profile' + target.charAt(0).toUpperCase() + target.slice(1)).style.display = 'block';
            });
        });
        if (logoutFromProfile) logoutFromProfile.addEventListener('click', () => { Auth.logout(); window.location.href = 'index.html'; });
    }

    async function loadProfileData() {
        const user = Auth.current();
        if (!user) return;
        const ordersList = document.getElementById('myOrdersList');
        ordersList.innerHTML = '<p>Загрузка...</p>';
        try {
            const res = await fetch('/api/orders');
            const allOrders = await res.json();
            const myOrders = allOrders.filter(o => o.name.toLowerCase().includes(user.name.toLowerCase()));
            ordersList.innerHTML = myOrders.map(o => `<div class="list-item">Заказ №${o.id} | ${DFUtil.formatPrice(o.total)}</div>`).join('') || '<p>Нет заказов</p>';
        } catch (e) {
            ordersList.innerHTML = '<p>Ошибка загрузки</p>';
        }
    }

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { 
            if(quickViewModal) quickViewModal.classList.remove('open'); 
            if(checkoutModal) checkoutModal.classList.remove('open'); 
            if(pageModal) pageModal.classList.remove('open'); 
            if(profileModal) profileModal.classList.remove('open');
            closeCart(); 
        }
    });
});