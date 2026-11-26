// app.js — DropFlow
document.addEventListener('DOMContentLoaded', async () => {
    if (!document.querySelector('.hero')) return;

    // Обновляем сессию и данные с сервера
    await Auth.refresh();
    await Store.refreshServerData();

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
    const checkoutTotal = document.getElementById('checkoutTotal');
    const deliveryType = document.getElementById('deliveryType');
    const pickupRow = document.getElementById('pickupRow');
    const addressRow = document.getElementById('addressRow');
    const addressInput = document.getElementById('addressInput');
    const pickPickupBtn = document.getElementById('pickPickupBtn');
    const pickupModal = document.getElementById('pickupModal');
    const pickupSearch = document.getElementById('pickupSearch');
    const pickupPointsList = document.getElementById('pickupPointsList');
    const pickupMapWrap = document.getElementById('pickupMapWrap');
    const pickupMap = document.getElementById('pickupMap');
    const reviewProduct = document.getElementById('reviewProduct');
    const reviewText = document.getElementById('reviewText');
    const reviewSubmit = document.getElementById('reviewSubmit');
    const typewriterText = document.getElementById('typewriterText');

    let allProducts = [];
    let cart = Store.getCart();
    let fav = Store.getFav();
    let appliedPromo = null;
    let selectedPickup = null;
    let pickupPoints = [];
    let lastOrderId = null;

    await init();

    async function init() {
        await loadProducts();
        await renderCategories();
        renderProducts();
        updateCartUI();
        updateFavUI();
        updateAuthUI();
        startTypewriter(); // 17. Запуск анимации
        initProfileTabs();
        renderBanner();
        applyHeroBackground();
        renderFooter();
        renderAbout();
        renderStaticPages();
    }

    // ===== 17. АНИМАЦИЯ ПЕЧАТАЮЩЕГО ТЕКСТА =====
    function startTypewriter() {
        if (!typewriterText) return;
        const words = ['уютнее', 'комфортнее', 'живее', 'теплее', 'роднее'];
        let wordIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let currentText = '';

        function type() {
            const currentWord = words[wordIndex];
            
            if (isDeleting) {
                currentText = currentWord.substring(0, charIndex - 1);
                charIndex--;
            } else {
                currentText = currentWord.substring(0, charIndex + 1);
                charIndex++;
            }

            typewriterText.textContent = currentText;

            let typeSpeed = isDeleting ? 50 : 100;

            if (!isDeleting && charIndex === currentWord.length) {
                typeSpeed = 2000; // Пауза перед удалением
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                wordIndex = (wordIndex + 1) % words.length;
                typeSpeed = 500; // Пауза перед новым словом
            }

            setTimeout(type, typeSpeed);
        }

        type();
    }

    // ===== БАННЕР И ФОН =====
    function renderBanner() {
        const banner = document.getElementById('catalogBanner');
        if (!banner) return;
        const s = Store.getSettings();
        if (s.bannerImage) {
            banner.innerHTML = `<a href="#catalog"><img src="${DFUtil.escapeHtml(s.bannerImage)}" alt="Акция" style="width:100%; border:1px solid var(--accent); margin-bottom:30px;"></a>`;
        } else {
            banner.innerHTML = `
                <div style="background: linear-gradient(135deg, var(--bg-2), var(--bg-3)); padding: 25px; text-align: center; border: 1px solid var(--accent); margin-bottom: 30px;">
                    <h3 style="color: var(--accent); margin-bottom: 10px; font-size: 24px;">🔥 Акция!</h3>
                    <p style="color: var(--text); font-size: 16px;">Скидка 10% на первый заказ по промокоду <b>WELCOME10</b></p>
                </div>
            `;
        }
    }

    function applyHeroBackground() {
        const hero = document.querySelector('.hero');
        if (!hero) return;
        const s = Store.getSettings();
        if (s.heroImage) hero.style.backgroundImage = `url('${s.heroImage}')`;
    }

    function renderFooter() {
        const el = document.getElementById('footerContacts');
        if (!el) return;
        const s = Store.getSettings();
        el.innerHTML = `${DFUtil.escapeHtml(s.legalName || '')}<br>ИНН ${DFUtil.escapeHtml(s.inn || '')}<br>${DFUtil.escapeHtml(s.email || '')} · ${DFUtil.escapeHtml(s.phone || '')}`;
    }

    function renderAbout() {
        const el = document.getElementById('aboutContent');
        if (el) el.innerHTML = Store.getPages().about || '';
    }

    // ===== ТОВАРЫ =====
    async function loadProducts() {
        try {
            const res = await fetch('/api/products');
            allProducts = await res.json();
        } catch (e) {
            console.error('Ошибка загрузки товаров', e);
            allProducts = [];
        }
    }

    async function renderCategories() {
        if (!categoryFilter) return;
        try {
            const res = await fetch('/api/categories');
            const cats = await res.json();
            categoryFilter.innerHTML = '<option value="all">Все товары</option>' + cats.map(c => `<option value="${DFUtil.escapeHtml(c.name)}">${DFUtil.escapeHtml(c.name)}</option>`).join('');
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
        grid.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); addToCart(Number(b.dataset.add)); }));
        grid.querySelectorAll('[data-fav]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); toggleFav(Number(b.dataset.fav)); }));
        grid.querySelectorAll('[data-quick]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openQuickView(Number(b.dataset.quick)); }));
    }

    if (searchInput) searchInput.addEventListener('input', renderProducts);
    if (categoryFilter) categoryFilter.addEventListener('change', renderProducts);
    if (resetFilters) resetFilters.addEventListener('click', () => { searchInput.value = ''; categoryFilter.value = 'all'; renderProducts(); });
    const noResultsReset = document.getElementById('noResultsReset');
    if (noResultsReset) noResultsReset.addEventListener('click', () => { searchInput.value = ''; categoryFilter.value = 'all'; renderProducts(); });

    // ===== КОРЗИНА =====
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

    function calcTotals() {
        const sub = cart.reduce((s, i) => s + i.price * i.quantity, 0);
        let discount = 0;
        if (appliedPromo) discount = appliedPromo.type === 'percent' ? Math.round(sub * appliedPromo.value / 100) : Math.min(appliedPromo.value, sub);
        return { sub, discount, total: Math.max(0, sub - discount) };
    }

    function updateCartUI() {
        if (!cartCount) return;
        const count = cart.reduce((s, i) => s + i.quantity, 0);
        cartCount.textContent = count;
        if (cart.length === 0) {
            cartItems.innerHTML = '<div class="empty-cart">Корзина пуста</div>';
            if (checkoutBtn) checkoutBtn.disabled = true;
        } else {
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

        const { discount, total } = calcTotals();
        if (totalItems) totalItems.textContent = count;
        if (totalDiscount) totalDiscount.textContent = DFUtil.formatPrice(discount);
        if (totalPrice) totalPrice.textContent = DFUtil.formatPrice(total);
        if (checkoutTotal) checkoutTotal.textContent = DFUtil.formatPrice(total);
    }

    function openCart() { if (cartPanel) cartPanel.classList.add('open'); if (cartOverlay) cartOverlay.classList.add('active'); }
    function closeCart() { if (cartPanel) cartPanel.classList.remove('open'); if (favPanel) favPanel.classList.remove('open'); if (cartOverlay) cartOverlay.classList.remove('active'); }

    if (cartBtn) cartBtn.addEventListener('click', openCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

    // ===== ПРОМОКОД =====
    if (applyPromoBtn) {
        applyPromoBtn.addEventListener('click', async () => {
            if (!promoInput) return;
            const code = promoInput.value.trim();
            if (!code) return;
            const { sub } = calcTotals();
            try {
                const res = await fetch('/api/promo/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, subtotal: sub })
                });
                const data = await res.json();
                if (!data.success) {
                    appliedPromo = null;
                    promoMessage.textContent = data.error || 'Промокод не найден';
                    promoMessage.className = 'promo-message err';
                } else {
                    appliedPromo = data.promo;
                    updateCartUI();
                    promoMessage.textContent = `Промокод применён: −${DFUtil.formatPrice(data.discount)}`;
                    promoMessage.className = 'promo-message ok';
                }
            } catch (e) {
                promoMessage.textContent = 'Ошибка проверки промокода';
                promoMessage.className = 'promo-message err';
            }
        });
    }

    // ===== ИЗБРАННОЕ =====
    function toggleFav(id) {
        const idx = fav.indexOf(id);
        if (idx === -1) { fav.push(id); DFUtil.toast('Добавлено в избранное', 'success', 1800); }
        else fav.splice(idx, 1);
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

    if (favBtn) favBtn.addEventListener('click', () => { if (favPanel) favPanel.classList.add('open'); if (cartOverlay) cartOverlay.classList.add('active'); });
    if (closeFavBtn) closeFavBtn.addEventListener('click', closeCart);

    // ===== БЫСТРЫЙ ПРОСМОТР (с отзывами) =====
    async function openQuickView(id) {
        const p = allProducts.find(x => x.id === id);
        if (!p || !quickViewBody) return;
        const hasOld = p.old_price && p.old_price > p.price;
        
        // 6. Загружаем отзывы
        let reviewsHtml = '<p style="color:var(--text-3); font-size:13px; margin-top:10px;">Отзывов пока нет.</p>';
        try {
            const res = await fetch(`/api/comments?productId=${id}`);
            const reviews = await res.json();
            if (reviews.length > 0) {
                reviewsHtml = `<div class="reviews-list">
                    <h4 style="font-size:14px; margin-bottom:8px; color:var(--accent);">Отзывы (${reviews.length})</h4>
                    ${reviews.map(r => `
                        <div class="review-item">
                            <div class="review-author">${DFUtil.escapeHtml(r.user_name)}</div>
                            <div class="review-text">${DFUtil.escapeHtml(r.text)}</div>
                        </div>
                    `).join('')}
                </div>`;
            }
        } catch(e) { console.error('Ошибка отзывов', e); }

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
                    ${reviewsHtml}
                </div>
            </div>
        `;
        quickViewBody.querySelector('[data-qv-add]').addEventListener('click', () => { addToCart(p.id); quickViewModal.classList.remove('open'); });
        quickViewModal.classList.add('open');
    }
    if (closeQuickView) closeQuickView.addEventListener('click', () => quickViewModal.classList.remove('open'));

    // ===== ОФОРМЛЕНИЕ ЗАКАЗА =====
    if (checkoutBtn) checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) return;
        const u = Auth.current();
        if (u) {
            const nameField = checkoutForm.querySelector('[name=name]');
            const phoneField = checkoutForm.querySelector('[name=phone]');
            const emailField = checkoutForm.querySelector('[name=email]');
            if (nameField && !nameField.value) nameField.value = u.name || '';
            if (phoneField && !phoneField.value) phoneField.value = u.phone || '';
            if (emailField && !emailField.value) emailField.value = u.email || '';
        }
        closeCart();
        checkoutModal.classList.add('open');
    });
    if (closeCheckout) closeCheckout.addEventListener('click', () => checkoutModal.classList.remove('open'));

    if (deliveryType) deliveryType.addEventListener('change', () => {
        const isPickup = deliveryType.value === 'pickup';
        pickupRow.style.display = isPickup ? 'block' : 'none';
        addressRow.style.display = isPickup ? 'none' : 'block';
        if (!isPickup) addressInput.required = true; else addressInput.required = false;
    });

    // ===== ВЫБОР ПУНКТА ВЫДАЧИ =====
    async function loadPickupPoints() {
        try {
            pickupPoints = await (await fetch('/api/pickup')).json();
        } catch (e) { pickupPoints = []; }
        renderPickupList();
    }

    function renderPickupList() {
        if (!pickupPointsList) return;
        const q = pickupSearch ? pickupSearch.value.trim().toLowerCase() : '';
        const list = pickupPoints.filter(p => ((p.city || '') + ' ' + (p.address || '') + ' ' + (p.name || '')).toLowerCase().includes(q));
        if (list.length === 0) { pickupPointsList.innerHTML = '<div class="list-empty">Пункты выдачи не найдены</div>'; return; }
        pickupPointsList.innerHTML = list.map(p => `
            <div class="list-item" style="padding:12px 14px;">
                <div class="list-item-info">
                    <h4>${DFUtil.escapeHtml(p.city || '')} · ${DFUtil.escapeHtml(p.name || 'Пункт выдачи СДЭК')}</h4>
                    <p>${DFUtil.escapeHtml(p.address)}</p>
                </div>
                <div class="list-actions">
                    <button class="btn-ghost" data-pick="${p.id}">Выбрать</button>
                </div>
            </div>
        `).join('');
        pickupPointsList.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => {
            selectedPickup = pickupPoints.find(p => p.id === Number(b.dataset.pick));
            document.getElementById('pickupIdInput').value = selectedPickup.id;
            document.getElementById('pickupSelected').textContent = `Выбрано: ${selectedPickup.city || ''}, ${selectedPickup.address}`;
            pickupModal.classList.remove('open');
        }));
    }

    if (pickPickupBtn) pickPickupBtn.addEventListener('click', async () => {
        pickupModal.classList.add('open');
        await loadPickupPoints();
        const withCoords = pickupPoints.find(p => p.lat && p.lng);
        if (withCoords) {
            pickupMapWrap.style.display = 'block';
            pickupMap.src = `https://yandex.ru/map-widget/v1/?ll=${withCoords.lng}%2C${withCoords.lat}&z=12&pt=${withCoords.lng},${withCoords.lat},pm2rdm`;
        } else {
            pickupMapWrap.style.display = 'none';
        }
    });
    if (pickupSearch) pickupSearch.addEventListener('input', renderPickupList);
    document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => document.getElementById(btn.dataset.close).classList.remove('open')));

    // ===== ОПЛАТА (Совместимость с сервером) =====
    if (payBtn) {
        payBtn.addEventListener('click', async () => {
            if (!checkoutForm.checkValidity()) { checkoutForm.reportValidity(); return; }
            const isPickup = !deliveryType || deliveryType.value === 'pickup';
            if (isPickup && !selectedPickup) { DFUtil.toast('Выберите пункт выдачи', 'warning'); return; }
            if (!isPickup && !addressInput.value.trim()) { DFUtil.toast('Укажите адрес доставки', 'warning'); return; }

            const fd = new FormData(checkoutForm);
            const address = isPickup
                ? `ПВЗ СДЭК: ${selectedPickup.city || ''}, ${selectedPickup.address} (ID ${selectedPickup.id})`
                : addressInput.value.trim();

            payBtn.disabled = true;
            payBtn.textContent = 'Создаём заказ...';

            try {
                // 1. Сохраняем заказ (теперь без total, сервер сам посчитает)
                const orderRes = await fetch('/api/order', {
                    method: 'POST',
                    headers: Object.assign({ 'Content-Type': 'application/json' }, Store.authHeaders()),
                    body: JSON.stringify({
                        name: fd.get('name'),
                        phone: fd.get('phone'),
                        email: fd.get('email'),
                        address,
                        comment: fd.get('comment') || '',
                        items: cart,
                        promoCode: appliedPromo ? appliedPromo.code : null
                    })
                });
                const orderData = await orderRes.json();
                if (!orderData.success) {
                    DFUtil.toast(orderData.error || 'Ошибка оформления заказа', 'error');
                    payBtn.disabled = false;
                    payBtn.textContent = 'Перейти к оплате';
                    return;
                }
                lastOrderId = orderData.orderId;

                // 2. Создаём платёж
                payBtn.textContent = 'Открываем оплату...';
                const payRes = await fetch('/api/pay', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: lastOrderId })
                });
                const payData = await payRes.json();
                if (payData.success && payData.confirmation_url) {
                    window.location.href = payData.confirmation_url;
                } else {
                    DFUtil.toast(payData.error || 'Ошибка создания платежа', 'error');
                    payBtn.disabled = false;
                    payBtn.textContent = 'Перейти к оплате';
                }
            } catch (e) {
                console.error('Ошибка:', e);
                DFUtil.toast('Не удалось связаться с сервером', 'error');
                payBtn.disabled = false;
                payBtn.textContent = 'Перейти к оплате';
            }
        });
    }

    // ===== СТРАНИЦЫ =====
    function openPage(key) {
        let html = Store.getPages()[key] || '<p>Страница не найдена</p>';
        if (key === 'contacts') {
            const s = Store.getSettings();
            html = `<h2>Контакты</h2><p><b>Компания:</b> ${DFUtil.escapeHtml(s.legalName || '')}</p><p><b>ИНН:</b> ${DFUtil.escapeHtml(s.inn || '')}</p><p><b>Email:</b> ${DFUtil.escapeHtml(s.email || '')}</p><p><b>Телефон:</b> ${DFUtil.escapeHtml(s.phone || '')}</p><p><b>Адрес:</b> ${DFUtil.escapeHtml(s.address || '')}</p>`;
        }
        pageBody.innerHTML = html;
        pageModal.classList.add('open');
        pageBody.querySelectorAll('.faq-q').forEach(btn => btn.addEventListener('click', () => btn.parentElement.classList.toggle('open')));
    }

    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            openPage(link.dataset.page);
        });
    });
    if (closePage) closePage.addEventListener('click', () => pageModal.classList.remove('open'));

    function renderStaticPages() {}

    // ===== ЛИЧНЫЙ КАБИНЕТ =====
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
                if (target === 'review') fillReviewProducts();
            });
        });
        if (logoutFromProfile) logoutFromProfile.addEventListener('click', () => { Auth.logout(); window.location.href = 'index.html'; });

        if (reviewSubmit) reviewSubmit.addEventListener('click', async () => {
            if (!Auth.isLoggedIn()) { DFUtil.toast('Войдите, чтобы оставить отзыв', 'warning'); return; }
            if (!reviewText.value.trim() || reviewText.value.trim().length < 3) { DFUtil.toast('Напишите текст отзыва', 'warning'); return; }
            try {
                const res = await fetch('/api/comments', {
                    method: 'POST',
                    headers: Object.assign({ 'Content-Type': 'application/json' }, Store.authHeaders()),
                    body: JSON.stringify({ productId: Number(reviewProduct.value) || null, text: reviewText.value.trim() })
                });
                const data = await res.json();
                if (data.success) {
                    reviewText.value = '';
                    DFUtil.toast(data.message || 'Отзыв отправлен на проверку', 'success');
                } else DFUtil.toast(data.error || 'Ошибка отправки', 'error');
            } catch (e) { DFUtil.toast('Не удалось связаться с сервером', 'error'); }
        });
    }

    function fillReviewProducts() {
        if (!reviewProduct) return;
        reviewProduct.innerHTML = allProducts.map(p => `<option value="${p.id}">${DFUtil.escapeHtml(p.name)}</option>`).join('');
    }

    async function loadProfileData() {
        const user = Auth.current();
        if (!user) return;
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        set('profName', user.name);
        set('profLogin', user.login);
        set('profEmail', user.email);
        set('profPhone', user.phone);

        const ordersList = document.getElementById('myOrdersList');
        ordersList.innerHTML = '<p>Загрузка...</p>';
        try {
            const res = await fetch('/api/orders/my', { headers: Store.authHeaders() });
            if (res.status === 401) { Auth.logout(); updateAuthUI(); ordersList.innerHTML = '<p>Войдите заново</p>'; return; }
            const myOrders = await res.json();
            const payLabels = { 'pending': '⏳ Не оплачен', 'paid': '✅ Оплачен', 'canceled': '❌ Отменён' };
            const statusLabels = { 'active': 'Оформлен', 'shipped': 'Передан в доставку', 'delivering': 'Доставляется', 'arrived': 'Приехал', 'done': 'Завершён', 'canceled': 'Отменён' };
            ordersList.innerHTML = myOrders.length === 0 ? '<p>Заказов пока нет</p>' : myOrders.map(o => `
                <div class="list-item">
                    <div class="list-item-info">
                        <h4>Заказ №${o.id} · ${DFUtil.formatPrice(o.total)}</h4>
                        <p>${statusLabels[o.status] || o.status} · ${payLabels[o.payment_status] || ''}</p>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            ordersList.innerHTML = '<p>Ошибка загрузки</p>';
        }
    }

    // ===== ПРОЧЕЕ =====
    if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    const burgerBtn = document.getElementById('burgerBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (burgerBtn && mobileMenu) {
        burgerBtn.addEventListener('click', () => mobileMenu.classList.toggle('open'));
        mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));
    }

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (quickViewModal) quickViewModal.classList.remove('open');
            if (checkoutModal) checkoutModal.classList.remove('open');
            if (pageModal) pageModal.classList.remove('open');
            if (profileModal) profileModal.classList.remove('open');
            if (pickupModal) pickupModal.classList.remove('open');
            closeCart();
        }
    });
});