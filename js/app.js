document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('.hero')) return;

    // ====== ЭЛЕМЕНТЫ ======
    const authBtn = document.getElementById('authBtn');
    const authBtnText = document.getElementById('authBtnText');
    
    const cartBtn = document.getElementById('cartBtn');
    const cartPanel = document.getElementById('cartPanel');
    const cartOverlay = document.getElementById('cartOverlay');
    const closeCartBtn = document.getElementById('closeCartBtn');

    // Каталог
    const grid = document.getElementById('productsGrid');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const noResults = document.getElementById('noResults');
    const resetFilters = document.getElementById('resetFilters');

    // Корзина
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const totalItems = document.getElementById('totalItems');
    const totalPrice = document.getElementById('totalPrice');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const promoInput = document.getElementById('promoInput');
    const applyPromoBtn = document.getElementById('applyPromoBtn');
    const promoMessage = document.getElementById('promoMessage');
    const totalDiscount = document.getElementById('totalDiscount');

    // Избранное
    const favBtn = document.getElementById('favBtn');
    const favPanel = document.getElementById('favPanel');
    const closeFavBtn = document.getElementById('closeFavBtn');
    const favItems = document.getElementById('favItems');
    const favCount = document.getElementById('favCount');

    // Прочее
    const toTop = document.getElementById('toTop');
    const quickViewModal = document.getElementById('quickViewModal');
    const quickViewBody = document.getElementById('quickViewBody');
    const closeQuickView = document.getElementById('closeQuickView');
    const checkoutModal = document.getElementById('checkoutModal');
    const checkoutForm = document.getElementById('checkoutForm');
    const closeCheckout = document.getElementById('closeCheckout');
    const pageModal = document.getElementById('pageModal');
    const pageBody = document.getElementById('pageBody');
    const closePage = document.getElementById('closePage');

    // Профиль
    const profileModal = document.getElementById('profileModal');
    const closeProfile = document.getElementById('closeProfile');
    const logoutFromProfile = document.getElementById('logoutFromProfile');

    // Состояние
    let allProducts = [];
    let cart = Store.getCart();
    let fav = Store.getFav();
    let appliedPromo = null;

    init();

    function init() {
        allProducts = Store.getProducts();
        renderCategories();
        renderProducts();
        updateCartUI();
        updateFavUI();
        updateAuthUI();
        startTypewriter();
        initProfileTabs();
    }

    // ====== СТРАНИЦЫ ======
    function startTypewriter() {
        const typeTarget = document.getElementById('typewriter');
        if (!typeTarget) return;
        const words = ['уютнее', 'проще', 'приятнее', 'теплее'];
        let wordIndex = 0;
        let charIndex = words[0].length;
        let isDeleting = true;

        function type() {
            const currentWord = words[wordIndex];
            if (isDeleting) {
                typeTarget.textContent = currentWord.substring(0, charIndex - 1);
                charIndex--;
            } else {
                typeTarget.textContent = currentWord.substring(0, charIndex + 1);
                charIndex++;
            }
            let typeSpeed = isDeleting ? 50 : 100;
            if (!isDeleting && charIndex === currentWord.length) {
                typeSpeed = 2000;
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                wordIndex = (wordIndex + 1) % words.length;
                typeSpeed = 500;
            }
            setTimeout(type, typeSpeed);
        }
        setTimeout(type, 2000);
    }

    // ====== КАТАЛОГ ======
    function renderCategories() {
        if (!categoryFilter) return;
        const cats = [...new Set(allProducts.map(p => p.category))].sort();
        categoryFilter.innerHTML = '<option value="all">Все товары</option>' + cats.map(c => `<option value="${DFUtil.escapeHtml(c)}">${DFUtil.escapeHtml(c)}</option>`).join('');
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
        const hasOld = p.oldPrice && p.oldPrice > p.price;
        const discount = hasOld ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
        return `
            <div class="product-card" data-id="${p.id}">
                <div class="product-media">
                    <img src="${DFUtil.escapeHtml(p.image)}" alt="${DFUtil.escapeHtml(p.name)}" onerror="this.onerror=null;this.src='https://via.placeholder.com/400x400/1a2f26/e8b06a?text=DropFlow';">
                    <div class="product-badges">
                        ${hasOld ? `<span class="p-badge sale">-${discount}%</span>` : ''}
                        ${p.isNew ? `<span class="p-badge new">New</span>` : ''}
                    </div>
                    <button class="fav-btn ${isFav ? 'active' : ''}" data-fav="${p.id}" aria-label="В избранное">♥</button>
                    <button class="quick-view-btn" data-quick="${p.id}">Быстрый просмотр</button>
                </div>
                <div class="product-info">
                    <span class="product-category">${DFUtil.escapeHtml(p.category)}</span>
                    <h3 class="product-name">${DFUtil.escapeHtml(p.name)}</h3>
                    <div class="product-rating"><span class="stars">${DFUtil.stars(p.rating)}</span><span>${(p.rating || 0).toFixed(1)}</span></div>
                    <div class="product-price-row">
                        <span class="product-price">${DFUtil.formatPrice(p.price)}</span>
                        ${hasOld ? `<span class="product-old-price">${DFUtil.formatPrice(p.oldPrice)}</span>` : ''}
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
            
            const btn = e.currentTarget;
            if (btn.classList.contains('loading')) return;
            
            btn.classList.add('loading');
            const originalText = btn.textContent;
            btn.textContent = 'Добавлено';
            
            setTimeout(() => {
                btn.classList.remove('loading');
                btn.textContent = originalText;
            }, 1500);

            addToCart(Number(b.dataset.add)); 
        }));
        grid.querySelectorAll('[data-fav]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); toggleFav(Number(b.dataset.fav)); }));
        grid.querySelectorAll('[data-quick]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openQuickView(Number(b.dataset.quick)); }));
    }

    if (searchInput) searchInput.addEventListener('input', renderProducts);
    if (categoryFilter) categoryFilter.addEventListener('change', renderProducts);
    if (resetFilters) resetFilters.addEventListener('click', () => { searchInput.value = ''; categoryFilter.value = 'all'; renderProducts(); });

    // ====== КОРЗИНА ======
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
                    <img src="${DFUtil.escapeHtml(i.image)}" alt="${DFUtil.escapeHtml(i.name)}" onerror="this.onerror=null;this.src='https://via.placeholder.com/72x72/1a2f26/e8b06a?text=X';">
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

        if (appliedPromo && appliedPromo.minTotal && sub < appliedPromo.minTotal) { appliedPromo = null; if (promoMessage) { promoMessage.textContent = ''; promoMessage.className = 'promo-message'; } }
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
            if (!code) { promoMessage.textContent = 'Введите промокод'; promoMessage.className = 'promo-message err'; return; }
            const promos = Store.getPromos();
            const promo = promos.find(p => p.code.toUpperCase() === code);
            if (!promo) { promoMessage.textContent = 'Промокод не найден'; promoMessage.className = 'promo-message err'; return; }
            const sub = cart.reduce((s, i) => s + i.price * i.quantity, 0);
            if (promo.minTotal && sub < promo.minTotal) { promoMessage.textContent = `Минимальная сумма: ${DFUtil.formatPrice(promo.minTotal)}`; promoMessage.className = 'promo-message err'; return; }
            appliedPromo = promo;
            const txt = promo.type === 'percent' ? `−${promo.value}%` : `−${DFUtil.formatPrice(promo.value)}`;
            promoMessage.textContent = `Промокод применён: ${txt}`;
            promoMessage.className = 'promo-message ok';
            updateCartUI();
        });
    }

    // ====== ИЗБРАННОЕ ======
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
        if (fav.length === 0) { if(favItems) favItems.innerHTML = '<div class="empty-cart">В избранном пусто</div>'; return; }
        const list = allProducts.filter(p => fav.includes(p.id));
        if(favItems) {
            favItems.innerHTML = list.map(p => `
                <div class="cart-item">
                    <img src="${DFUtil.escapeHtml(p.image)}" alt="${DFUtil.escapeHtml(p.name)}" onerror="this.onerror=null;this.src='https://via.placeholder.com/72x72/1a2f26/e8b06a?text=X';">
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
    }

    if (favBtn) favBtn.addEventListener('click', () => { if(favPanel) favPanel.classList.add('open'); if(cartOverlay) cartOverlay.classList.add('active'); });
    if (closeFavBtn) closeFavBtn.addEventListener('click', closeCart);

    // ====== БЫСТРЫЙ ПРОСМОТР ======
    function openQuickView(id) {
        const p = allProducts.find(x => x.id === id);
        if (!p || !quickViewBody) return;
        const hasOld = p.oldPrice && p.oldPrice > p.price;
        const reviewsHtml = (p.reviews && p.reviews.length) ? p.reviews.map(r => `
            <div class="review">
                <div class="review-head"><span class="review-name">${DFUtil.escapeHtml(r.name)}</span><span class="review-stars">${DFUtil.stars(r.rating)}</span></div>
                <div class="review-text">${DFUtil.escapeHtml(r.text)}</div>
            </div>
        `).join('') : '<p style="color:var(--text-3);font-size:13px;">Отзывов пока нет</p>';

        quickViewBody.innerHTML = `
            <div class="qv-grid">
                <div class="qv-image"><img src="${DFUtil.escapeHtml(p.image)}" alt="${DFUtil.escapeHtml(p.name)}" onerror="this.onerror=null;this.src='https://via.placeholder.com/600x600/1a2f26/e8b06a?text=DropFlow';"></div>
                <div class="qv-info">
                    <span class="product-category">${DFUtil.escapeHtml(p.category)}</span>
                    <h2>${DFUtil.escapeHtml(p.name)}</h2>
                    <div class="product-rating"><span class="stars">${DFUtil.stars(p.rating)}</span><span>${(p.rating || 0).toFixed(1)}</span></div>
                    <p class="qv-desc">${DFUtil.escapeHtml(p.description || '')}</p>
                    <div class="qv-price">${DFUtil.formatPrice(p.price)} ${hasOld ? `<span style="color:var(--text-3);font-size:16px;text-decoration:line-through;margin-left:10px;">${DFUtil.formatPrice(p.oldPrice)}</span>` : ''}</div>
                    <div class="qv-actions">
                        <button class="btn-accent big" data-qv-add="${p.id}">В корзину</button>
                        <button class="btn-ghost big" data-qv-fav="${p.id}">${fav.includes(p.id) ? '♥ Убрать' : '♥ В избранное'}</button>
                    </div>
                    <div class="reviews"><h3>Отзывы (${p.reviews ? p.reviews.length : 0})</h3>${reviewsHtml}</div>
                </div>
            </div>
        `;
        quickViewBody.querySelector('[data-qv-add]').addEventListener('click', () => { addToCart(p.id); quickViewModal.classList.remove('open'); });
        quickViewBody.querySelector('[data-qv-fav]').addEventListener('click', () => { toggleFav(p.id); quickViewModal.classList.remove('open'); });
        quickViewModal.classList.add('open');
    }
    
    if (closeQuickView) closeQuickView.addEventListener('click', () => quickViewModal.classList.remove('open'));
    if (quickViewModal) quickViewModal.addEventListener('click', e => { if (e.target === quickViewModal) quickViewModal.classList.remove('open'); });

    // ====== ОФОРМЛЕНИЕ ЗАКАЗА ======
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) return;
            closeCart();
            if(checkoutModal) checkoutModal.classList.add('open');
        });
    }
    if (closeCheckout) closeCheckout.addEventListener('click', () => checkoutModal.classList.remove('open'));
    if (checkoutModal) checkoutModal.addEventListener('click', e => { if (e.target === checkoutModal) checkoutModal.classList.remove('open'); });

    const payBtn = document.getElementById('payBtn');
    if (payBtn) {
        payBtn.addEventListener('click', () => {
            if (!checkoutForm.checkValidity()) {
                checkoutForm.reportValidity();
                return;
            }
            
            const sub = cart.reduce((s, i) => s + i.price * i.quantity, 0);
            let discount = 0;
            if (appliedPromo) discount = appliedPromo.type === 'percent' ? Math.round(sub * appliedPromo.value / 100) : Math.min(appliedPromo.value, sub);
            const total = Math.max(0, sub - discount);

            localStorage.setItem('df_last_total', total);
            window.location.href = 'payment.html';
        });
    }

    // ====== МЕЛОЧИ ======
    window.addEventListener('scroll', () => { if (toTop) { if (window.scrollY > 500) toTop.classList.add('show'); else toTop.classList.remove('show'); } });
    if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // ====== МОДАЛКИ СТРАНИЦ ======
    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const key = link.dataset.page;
            let html = '';
            const pages = Store.getPages();
            const settings = Store.getSettings();

            if (key === 'contacts') {
                html = `<h2>Контакты</h2>
                        <p><b>Email:</b> ${settings.email}</p>
                        <p><b>Телефон:</b> ${settings.phone}</p>
                        <p><b>Адрес:</b> ${settings.address}</p>
                        <p><b>Соцсети:</b> <a href="https://${settings.tg}" target="_blank">ВКонтакте</a></p>
                        <p><b>Реквизиты:</b><br>${settings.legalName}<br>ИНН: ${settings.inn}</p>`;
            } else if (key === 'faq') {
                html = `<h2>Часто спрашивают</h2>
                        <div class="faq-list">
                            <div class="faq-item"><button class="faq-q">Как оформить заказ?</button><div class="faq-a">Добавьте товары в корзину, нажмите «Оформить заказ», заполните форму и подтвердите.</div></div>
                            <div class="faq-item"><button class="faq-q">Сколько стоит доставка?</button><div class="faq-a">Доставка по России осуществляется через СДЭК — от 350 ₽.</div></div>
                            <div class="faq-item"><button class="faq-q">Можно ли оплатить при получении?</button><div class="faq-a">Оплата происходит онлайн через ЮKassa.</div></div>
                            <div class="faq-item"><button class="faq-q">Как вернуть товар?</button><div class="faq-a">Возврат возможен в течение 14 дней.</div></div>
                            <div class="faq-item"><button class="faq-q">Придут ли SMS о заказе?</button><div class="faq-a">Мы отправляем уведомления о статусе заказа в наш Telegram-бот. Подпишитесь на <a href="https://t.me/DropFlowBot" target="_blank" style="color:var(--accent); text-decoration:underline;">@DropFlowBot</a>, чтобы получать статусы заказов.</div></div>
                        </div>`;
            } else if (key === 'about') {
                html = pages['about'] || '<p>Информация отсутствует</p>';
            } else {
                html = pages[key] || '<p>Страница не найдена</p>';
            }

            if(pageBody) pageBody.innerHTML = html;
            if(pageModal) pageModal.classList.add('open');

            if (pageBody) {
                pageBody.querySelectorAll('.faq-q').forEach(btn => btn.addEventListener('click', () => btn.parentElement.classList.toggle('open')));
            }
        });
    });
    if (closePage) closePage.addEventListener('click', () => pageModal.classList.remove('open'));
    if (pageModal) pageModal.addEventListener('click', e => { if (e.target === pageModal) pageModal.classList.remove('open'); });

    // ====== АВТОРИЗАЦИЯ (КНОПКА) ======
    function updateAuthUI() {
        if (!authBtn) return;
        if (Auth.isLoggedIn()) {
            const u = Auth.current();
            if(authBtnText) authBtnText.textContent = u.login;            
            if (u.role === 'admin') {
                authBtn.title = 'Перейти в админ-панель';
                authBtn.onclick = () => window.location.href = 'admin.html';
            } else {
                authBtn.title = 'Личный кабинет';
                authBtn.onclick = () => { 
                    if (profileModal) {
                        profileModal.classList.add('open');
                        loadProfileData();
                    }
                };
            }
        } else {
            if(authBtnText) authBtnText.textContent = 'Войти';
            authBtn.onclick = () => window.location.href = 'login.html';
        }
    }

    // ====== ЛОГИКА ПРОФИЛЯ ======
    function initProfileTabs() {
        if (closeProfile) closeProfile.addEventListener('click', () => profileModal.classList.remove('open'));
        if (profileModal) profileModal.addEventListener('click', (e) => { if (e.target === profileModal) profileModal.classList.remove('open'); });

        document.querySelectorAll('[data-profile-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('[data-profile-tab]').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const target = tab.dataset.profileTab;
                document.querySelectorAll('.profile-tab-content').forEach(c => c.style.display = 'none');
                document.getElementById('profile' + target.charAt(0).toUpperCase() + target.slice(1)).style.display = 'block';
            });
        });

        if (logoutFromProfile) {
            logoutFromProfile.addEventListener('click', () => {
                Auth.logout();
                window.location.href = 'index.html';
            });
        }
    }

    async function loadProfileData() {
        const user = Auth.current();
        if (!user) return;

        const ordersList = document.getElementById('myOrdersList');
        ordersList.innerHTML = '<p style="color: var(--text-3);">Загрузка...</p>';
        
        try {
            const response = await fetch('/api/orders');
            const allOrders = await response.json();
            
            const myOrders = allOrders.filter(o => {
                const orderName = o.name.toLowerCase().trim();
                const userName = user.name.toLowerCase().trim();
                return orderName.includes(userName) || userName.includes(orderName);
            });

            if (myOrders.length === 0) {
                ordersList.innerHTML = '<p style="color: var(--text-3);">У вас пока нет заказов.</p>';
            } else {
                const statusMap = {
                    'active': 'Оформлен', 'shipped': 'Передан в доставку', 'delivering': 'Доставляется',
                    'arrived': 'Приехал', 'done': 'Завершён', 'canceled': 'Отменён'
                };
                ordersList.innerHTML = myOrders.map(order => {
                    const status = statusMap[order.status] || order.status;
                    return `
                        <div class="list-item" style="flex-direction: column; align-items: flex-start; gap: 10px;">
                            <div style="display: flex; justify-content: space-between; width: 100%;">
                                <h4 style="margin: 0;">Заказ №${order.id}</h4>
                                <span class="tag active">${status}</span>
                            </div>
                            <p style="margin: 0; font-size: 13px; color: var(--text-2);">Дата: ${DFUtil.formatDate(order.createdAt || order.created_at)}</p>
                            <p style="margin: 0; font-size: 13px; color: var(--text-2);">Сумма: ${DFUtil.formatPrice(order.total)}</p>
                        </div>
                    `;
                }).join('');
            }
        } catch (err) {
            ordersList.innerHTML = '<p style="color: var(--danger);">Ошибка загрузки. Сервер недоступен.</p>';
        }

        const favContainer = document.getElementById('profileFavItems');
        if (fav.length === 0) {
            favContainer.innerHTML = '<p style="color: var(--text-3);">В избранном пусто.</p>';
        } else {
            const favList = allProducts.filter(p => fav.includes(p.id));
            favContainer.innerHTML = favList.map(p => `
                <div class="cart-item" style="align-items: center; padding: 10px 0;">
                    <img src="${DFUtil.escapeHtml(p.image)}" alt="${DFUtil.escapeHtml(p.name)}" onerror="this.onerror=null;this.src='https://via.placeholder.com/72x72/1a2f26/e8b06a?text=X';">
                    <div class="cart-item-info"><h4>${DFUtil.escapeHtml(p.name)}</h4><p>${DFUtil.formatPrice(p.price)}</p></div>
                    <button class="btn-accent" data-prof-fav-add="${p.id}">В корзину</button>
                </div>
            `).join('');
            
            favContainer.querySelectorAll('[data-prof-fav-add]').forEach(b => {
                b.addEventListener('click', () => {
                    addToCart(Number(b.dataset.profFavAdd));
                    loadProfileData();
                });
            });
        }

        const cartContainer = document.getElementById('profileCartItems');
        if (cart.length === 0) {
            cartContainer.innerHTML = '<p style="color: var(--text-3);">Корзина пуста.</p>';
        } else {
            cartContainer.innerHTML = cart.map(i => `
                <div class="cart-item" style="align-items: center; padding: 10px 0;">
                    <img src="${DFUtil.escapeHtml(i.image)}" alt="${DFUtil.escapeHtml(i.name)}" onerror="this.onerror=null;this.src='https://via.placeholder.com/72x72/1a2f26/e8b06a?text=X';">
                    <div class="cart-item-info"><h4>${DFUtil.escapeHtml(i.name)}</h4><p>${i.quantity} × ${DFUtil.formatPrice(i.price)}</p></div>
                </div>
            `).join('');
        }
    }

    // ====== ESCAPE ДЛЯ МОДАЛОК ======
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