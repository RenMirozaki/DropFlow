document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('.admin-page')) return;

    // Проверка прав
    if (!Auth.isAdmin()) {
        window.location.href = 'login.html';
        return;
    }

    // Показываем панель
    document.getElementById('adminApp').hidden = false;
    document.getElementById('adminApp').style.display = 'grid';
    
    initAdmin();
    
    function initAdmin() {
        let products = Store.getProducts();
        let orders = [];
        let promos = Store.getPromos();
        let users = Store.getUsers();
        let pages = Store.getPages();
        let settings = Store.getSettings();
        let currentPageKey = 'about';
        let orderFilter = 'all';

        const navItems = document.querySelectorAll('.admin-nav-item');
        const sections = document.querySelectorAll('.admin-section');
        const pageTitle = document.getElementById('adminPageTitle');
        const userName = document.getElementById('adminUserName');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Выйти из админки?')) { 
                    Auth.logout(); 
                    window.location.href = 'index.html'; 
                }
            });
        }

        const productModal = document.getElementById('productModal');
        const productForm = document.getElementById('productForm');
        const productModalTitle = document.getElementById('productModalTitle');
        const promoModal = document.getElementById('promoModal');
        const promoForm = document.getElementById('promoForm');
        const orderModal = document.getElementById('orderModal');
        const orderModalBody = document.getElementById('orderModalBody');

        const adminProductSearch = document.getElementById('adminProductSearch');
        const addProductBtn = document.getElementById('addProductBtn');
        const imageFileInput = document.getElementById('imageFile');
        const imageFileName = document.getElementById('imageFileName');
        const imagePathInput = document.getElementById('imagePath');
        
        const liveEditorContent = document.getElementById('liveEditorContent');
        const savePagesBtn = document.getElementById('savePagesBtn');
        const inputAbout = document.getElementById('editImageAbout');
        const inputHero = document.getElementById('editImageHero');

        userName.textContent = "Администратор";

        // --- МАСКА ТЕЛЕФОНА ---
        const setPhoneInput = document.getElementById('setPhone');
        if (setPhoneInput) {
            setPhoneInput.addEventListener('input', function(e) {
                let input = this.value.replace(/\D/g, '');
                if (input.length === 0) { this.value = ''; return; }
                if (input.startsWith('7') || input.startsWith('8')) input = input.substring(1);
                let formatted = '+7 (';
                if (input.length > 0) formatted += input.substring(0, 3);
                if (input.length >= 3) formatted += ') ' + input.substring(3, 6);
                if (input.length >= 6) formatted += '-' + input.substring(6, 8);
                if (input.length >= 8) formatted += '-' + input.substring(8, 10);
                this.value = formatted;
            });
            setPhoneInput.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace' && (this.value === '+7 (' || this.value === '+7')) this.value = '';
            });
        }

        // --- ЗАГРУЗКА КАРТИНОК ---
        if (imageFileInput) {
            imageFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    imageFileName.textContent = file.name;
                    imagePathInput.value = 'images/' + file.name;
                }
            });
        }

        // --- НАВИГАЦИЯ ---
        navItems.forEach(item => item.addEventListener('click', () => switchSection(item.dataset.section)));

        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => document.getElementById(btn.dataset.close).classList.remove('open'));
        });
        document.querySelectorAll('.modal').forEach(m => {
            m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
        });

        document.querySelectorAll('.admin-section[data-section="orders"] .tab').forEach(t => {
            t.addEventListener('click', () => {
                document.querySelectorAll('.admin-section[data-section="orders"] .tab').forEach(x => x.classList.remove('active'));
                t.classList.add('active');
                orderFilter = t.dataset.filter;
                renderOrders();
            });
        });

        // --- ТАБЫ СТРАНИЦ ---
        document.querySelectorAll('.admin-section[data-section="pages"] .tab').forEach(t => {
            t.addEventListener('click', () => {
                document.querySelectorAll('.admin-section[data-section="pages"] .tab').forEach(x => x.classList.remove('active'));
                t.classList.add('active');
                currentPageKey = t.dataset.page;
                loadPageEditor();
            });
        });

        // --- ФУНКЦИИ ---
        function switchSection(name) {
            navItems.forEach(i => i.classList.toggle('active', i.dataset.section === name));
            sections.forEach(s => s.classList.toggle('active', s.dataset.section === name));
            
            const titles = { products: 'Товары', orders: 'Все заказы', promo: 'Промокоды и скидки', users: 'Пользователи', pages: 'Страницы', settings: 'Настройки' };
            if (pageTitle) pageTitle.textContent = titles[name] || '';
            
            if (name === 'pages') loadPageEditor();
        }

        // --- ТОВАРЫ ---
        if (adminProductSearch) adminProductSearch.addEventListener('input', renderProducts);
        renderProducts();

        function renderProducts() {
            const q = adminProductSearch ? adminProductSearch.value.trim().toLowerCase() : '';
            const list = products.filter(p => p.name.toLowerCase().includes(q));
            const container = document.getElementById('adminProductsList');
            if (!container) return;

            if (list.length === 0) {
                container.innerHTML = '<div class="list-empty">Товаров нет.</div>';
                return;
            }

            container.innerHTML = list.map(p => {
                const hasOld = p.oldPrice && p.oldPrice > p.price;
                const isHidden = p.hidden ? 'checked' : '';
                return `
                    <div class="product-card" style="position:relative;">
                        <div class="toggle-wrapper" title="Скрыть с главной">
                            <input type="checkbox" class="toggle-checkbox" data-hide-toggle="${p.id}" id="toggle-${p.id}" ${isHidden}>
                            <label class="toggle-label" for="toggle-${p.id}">Скрыт</label>
                        </div>
                        <div class="product-media" data-edit-product="${p.id}" style="cursor:pointer;">
                            <img src="${DFUtil.escapeHtml(p.image)}" alt="${DFUtil.escapeHtml(p.name)}" onerror="this.onerror=null;this.src='https://via.placeholder.com/400x400/1a2f26/e8b06a?text=DropFlow';">
                            <div class="product-badges">
                                ${hasOld ? `<span class="p-badge sale">SALE</span>` : ''}
                                ${p.popular ? `<span class="p-badge" style="background:var(--accent-2);">TOP</span>` : ''}
                            </div>
                        </div>
                        <div class="product-info" data-edit-product="${p.id}" style="cursor:pointer;">
                            <span class="product-category">${DFUtil.escapeHtml(p.category)}</span>
                            <h3 class="product-name">${DFUtil.escapeHtml(p.name)}</h3>
                            <div class="product-rating"><span class="stars">${DFUtil.stars(p.rating)}</span></div>
                            <div class="product-price-row">
                                <span class="product-price">${DFUtil.formatPrice(p.price)}</span>
                                ${hasOld ? `<span class="product-old-price">${DFUtil.formatPrice(p.oldPrice)}</span>` : ''}
                            </div>
                            <button class="btn-ghost full" style="margin-top:10px; font-size:12px;">✎ Редактировать</button>
                        </div>
                    </div>
                `;
            }).join('');

            container.querySelectorAll('[data-edit-product]').forEach(card => {
                card.addEventListener('click', () => editProduct(Number(card.dataset.editProduct)));
            });

            container.querySelectorAll('[data-hide-toggle]').forEach(toggle => {
                toggle.addEventListener('change', (e) => {
                    const id = Number(e.target.dataset.hideToggle);
                    const p = products.find(x => x.id === id);
                    if (p) {
                        p.hidden = e.target.checked;
                        Store.setProducts(products);
                    }
                });
            });
        }

        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => {
                productForm.reset();
                productForm.id.value = '';
                imageFileName.textContent = '';
                imagePathInput.value = '';
                productModalTitle.textContent = 'Новый товар';
                productModal.classList.add('open');
            });
        }

        function editProduct(id) {
            const p = products.find(x => x.id === id);
            if (!p) return;
            productForm.id.value = p.id;
            productForm.name.value = p.name;
            productForm.category.value = p.category;
            productForm.price.value = p.price;
            productForm.oldPrice.value = p.oldPrice || '';
            productForm.rating.value = p.rating || 5;
            productForm.popular.value = p.popular ? 'yes' : 'no';
            imagePathInput.value = p.image;
            if (p.image && p.image.startsWith('images/')) {
                imageFileName.textContent = p.image.replace('images/', '');
            } else {
                imageFileName.textContent = 'Из интернета';
            }
            productForm.description.value = p.description || '';
            productModalTitle.textContent = 'Редактирование товара';
            productModal.classList.add('open');
        }

        if (productForm) {
            productForm.addEventListener('submit', e => {
                e.preventDefault();
                const fd = new FormData(productForm);
                const id = fd.get('id');
                const data = {
                    name: fd.get('name').trim(),
                    category: fd.get('category').trim(),
                    price: Number(fd.get('price').replace(/\D/g, '')),
                    oldPrice: fd.get('oldPrice') ? Number(fd.get('oldPrice').replace(/\D/g, '')) : null,
                    rating: Number(fd.get('rating')) || 5,
                    popular: fd.get('popular') === 'yes',
                    image: fd.get('image').trim(),
                    description: fd.get('description').trim(),
                    reviews: []
                };

                if (id) {
                    const idx = products.findIndex(p => p.id === Number(id));
                    if (idx > -1) products[idx] = { ...products[idx], ...data };
                } else {
                    data.id = Store.nextId('product');
                    products.unshift(data);
                }
                Store.setProducts(products);
                renderProducts();
                productModal.classList.remove('open');
                DFUtil.toast('Сохранено', 'success');
            });
        }

        // --- ЗАКАЗЫ ---
        function renderOrders() {
            const container = document.getElementById('adminOrdersList');
            if (!container) return;
            let list = orders;
            if (orderFilter === 'done')     list = orders.filter(o => o.status === 'done');
            if (orderFilter === 'canceled') list = orders.filter(o => o.status === 'canceled');
            if (orderFilter === 'all') {
                const newOrders = orders.filter(o => o.status === 'active');
                const processingOrders = orders.filter(o => ['shipped', 'delivering', 'arrived'].includes(o.status));
                list = [...newOrders, ...processingOrders];
            }

            if (list.length === 0) { container.innerHTML = '<div class="list-empty">Заказов нет</div>'; return; }

            const statusLabels = {
                'active': 'Оформлен', 'shipped': 'Передан в доставку', 'delivering': 'Доставляется',
                'arrived': 'Приехал', 'done': 'Завершён', 'canceled': 'Отменён'
            };

            let html = '';
            let hasInsertedDivider = false;

            list.forEach(o => {
                const st = o.status || 'active';
                
                if (orderFilter === 'all' && st !== 'active' && !hasInsertedDivider) {
                    html += `<div style="border-top: 1px solid var(--border); margin: 15px 0; padding-top: 15px; font-size: 12px; color: var(--text-3); letter-spacing: 0.05em; text-transform: uppercase;">В обработке и доставке</div>`;
                    hasInsertedDivider = true;
                }

                html += `
                    <div class="list-item">
                        <div class="list-item-info">
                            <h4>Заказ №${o.id} · ${DFUtil.escapeHtml(o.name)}</h4>
                            <p>
                                <span>${DFUtil.formatDate(o.createdAt || o.created_at)}</span>
                                <span>📞 ${DFUtil.escapeHtml(o.phone)}</span>
                                <b>${DFUtil.formatPrice(o.total)}</b>
                            </p>
                        </div>
                        <div class="list-actions">
                            <select class="input select status-select" data-order-id="${o.id}" style="width:auto; min-width:140px;">
                                ${Object.entries(statusLabels).map(([val, label]) => 
                                    `<option value="${val}" ${st === val ? 'selected' : ''}>${label}</option>`
                                ).join('')}
                            </select>
                            <button class="btn-ghost" data-view-order="${o.id}" style="padding: 0 16px; font-size: 13px; white-space: nowrap;">Посмотреть</button>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;

            container.querySelectorAll('[data-view-order]').forEach(b => b.addEventListener('click', () => viewOrder(Number(b.dataset.viewOrder))));
            container.querySelectorAll('.status-select').forEach(sel => {
                sel.addEventListener('change', (e) => setOrderStatus(Number(e.target.dataset.orderId), e.target.value));
            });
        }

        function viewOrder(id) {
            const o = orders.find(x => x.id === id);
            if (!o || !orderModalBody) return;
            
            const itemsHtml = o.items.map((item, index) => {
                const fullProduct = products.find(p => p.id === item.id) || {};
                const img = fullProduct.image || item.image || 'https://via.placeholder.com/100x100/1a2f26/e8b06a?text=No+Image';
                const desc = fullProduct.description || 'Описание отсутствует';
                
                return `
                    <div class="order-item-wrapper" style="margin-bottom: 10px; border: 1px solid var(--border); border-radius: var(--r-sm); overflow: hidden;">
                        <div class="order-item-header" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; cursor: pointer; background: var(--bg-3); transition: background 0.2s;" onclick="this.nextElementSibling.classList.toggle('open'); this.classList.toggle('active')">
                            <span style="font-weight: 500; color: #fff;">${DFUtil.escapeHtml(item.name)} <span style="color: var(--text-3); font-size: 12px; margin-left: 8px;">× ${item.quantity}</span></span>
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <span style="color: var(--accent); font-weight: 600;">${DFUtil.formatPrice(item.price * item.quantity)}</span>
                                <span class="chevron-icon" style="color: var(--text-3); transition: transform 0.3s;">▼</span>
                            </div>
                        </div>
                        
                        <div class="order-item-details" style="max-height: 0; overflow: hidden; transition: max-height 0.4s ease, padding 0.3s ease; background: var(--bg-2); padding: 0 15px;">
                            <div style="padding: 15px 0; display: flex; gap: 15px; border-top: 1px dashed var(--border);">
                                <img src="${DFUtil.escapeHtml(img)}" alt="" style="width: 80px; height: 80px; object-fit: cover; border-radius: var(--r-sm); flex-shrink: 0;">
                                <div>
                                    <div style="font-size: 12px; color: var(--text-3); margin-bottom: 4px;">КАТЕГОРИЯ: ${DFUtil.escapeHtml(fullProduct.category || '—')}</div>
                                    <div style="font-size: 13px; color: var(--text-2); line-height: 1.4;">${DFUtil.escapeHtml(desc)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            orderModalBody.innerHTML = `
                <div style="margin-bottom: 20px;">
                    <p style="margin-bottom: 5px;"><b>Клиент:</b> ${DFUtil.escapeHtml(o.name)}</p>
                    <p style="margin-bottom: 5px;"><b>Телефон:</b> ${DFUtil.escapeHtml(o.phone)}</p>
                    <p><b>Адрес:</b> ${DFUtil.escapeHtml(o.address)}</p>
                </div>
                <hr style="border:none;border-top:1px solid var(--border);margin:14px 0;">
                <h4 style="color: var(--text-2); margin-bottom: 10px; font-family: 'Montserrat', sans-serif; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Состав заказа (нажмите для деталей)</h4>
                
                <div class="order-items-list">
                    ${itemsHtml}
                </div>
                
                <hr style="border:none;border-top:1px solid var(--border);margin:14px 0;">
                <p style="font-size:18px;color:var(--accent);text-align:right;"><b>Итого: ${DFUtil.formatPrice(o.total)}</b></p>
            `;
            
            orderModal.classList.add('open');
        }

        async function setOrderStatus(id, status) {
            const idx = orders.findIndex(o => o.id === id);
            if (idx > -1) orders[idx].status = status;
            renderOrders();

            try {
                const response = await fetch('/api/order/status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id, status: status })
                });
                
                if (response.ok) {
                    DFUtil.toast('Статус сохранен в базе', 'success');
                } else {
                    DFUtil.toast('Ошибка сохранения статуса', 'error');
                }
            } catch (err) {
                console.error('Ошибка сети:', err);
                DFUtil.toast('Сервер не отвечает', 'error');
            }
        }

        // --- ПРОМОКОДЫ ---
        const addPromoBtn = document.getElementById('addPromoBtn');
        if (addPromoBtn) addPromoBtn.addEventListener('click', () => { promoForm.reset(); promoModal.classList.add('open'); });

        function renderPromos() {
            const container = document.getElementById('adminPromoList');
            if (!container) return;
            if (promos.length === 0) { container.innerHTML = '<div class="list-empty">Промокодов нет</div>'; return; }
            container.innerHTML = promos.map((p, i) => `
                <div class="list-item">
                    <div class="list-item-info">
                        <h4>${DFUtil.escapeHtml(p.code)}</h4>
                        <p><span class="tag ${p.type}">${p.type === 'percent' ? p.value + '%' : DFUtil.formatPrice(p.value)}</span></p>
                    </div>
                    <div class="list-actions"><button class="icon-btn danger" data-del-promo="${i}" title="Удалить">🗑</button></div>
                </div>
            `).join('');
            container.querySelectorAll('[data-del-promo]').forEach(b => b.addEventListener('click', () => {
                if (!confirm('Удалить?')) return;
                promos.splice(Number(b.dataset.delPromo), 1);
                Store.setPromos(promos); renderPromos(); DFUtil.toast('Удалено', 'success');
            }));
        }

        if (promoForm) {
            promoForm.addEventListener('submit', e => {
                e.preventDefault();
                const fd = new FormData(promoForm);
                promos.push({ code: fd.get('code').toUpperCase(), type: fd.get('type'), value: Number(fd.get('value')) });
                Store.setPromos(promos); renderPromos(); promoModal.classList.remove('open'); DFUtil.toast('Добавлено', 'success');
            });
        }

        // --- ПОЛЬЗОВАТЕЛИ ---
        const adminUserSearch = document.getElementById('adminUserSearch');
        if (adminUserSearch) adminUserSearch.addEventListener('input', renderUsers);

        function renderUsers() {
            const q = adminUserSearch ? adminUserSearch.value.trim().toLowerCase() : '';
            const list = users.filter(u => u.name.toLowerCase().includes(q) || u.login.toLowerCase().includes(q));
            const container = document.getElementById('adminUsersList');
            if (!container) return;
            if (list.length === 0) { container.innerHTML = '<div class="list-empty">Не найдено</div>'; return; }
            container.innerHTML = list.map(u => `
                <div class="list-item">
                    <div class="list-item-info">
                        <h4>${DFUtil.escapeHtml(u.name)} ${u.role === 'admin' ? '<span class="tag active">ADMIN</span>' : ''}</h4>
                        <p><span>@${DFUtil.escapeHtml(u.login)}</span><span>${DFUtil.escapeHtml(u.phone || '—')}</span></p>
                    </div>
                </div>
            `).join('');
        }

        // --- ЖИВОЙ РЕДАКТОР СТРАНИЦ ---
        function loadPageEditor() { 
            if (!liveEditorContent) return;
            let text = pages[currentPageKey] || '';
            
            let cleanText = text.replace(/<br\s*[\/]?>/gi, '\n') 
                                .replace(/<\/p>/gi, '\n\n') 
                                .replace(/<[^>]+>/g, '') 
                                .trim();
            
            liveEditorContent.innerText = cleanText;
        }

        if (savePagesBtn) {
            savePagesBtn.addEventListener('click', () => {
                if (!liveEditorContent) return;

                let rawText = liveEditorContent.innerText;
                
                let html = rawText.split(/\n\s*\n/).map(par => {
                    if (!par.trim()) return '';
                    return `<p>${par.replace(/\n/g, '<br>')}</p>`;
                }).join('');
                
                pages[currentPageKey] = html;
                Store.setPages(pages); 
                DFUtil.toast('Страница сохранена', 'success');
            });
        }

        if (inputAbout) {
            inputAbout.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    pages.aboutImage = 'images/' + file.name;
                    Store.setPages(pages);
                    DFUtil.toast('Фото для "О нас" выбрано', 'success');
                }
            });
        }

        if (inputHero) {
            inputHero.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    pages.heroImage = 'images/' + file.name;
                    Store.setPages(pages);
                    DFUtil.toast('Фон сайта выбран', 'success');
                }
            });
        }

        // --- НАСТРОЙКИ ---
        function loadSettings() {
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
            setVal('setSmsApiKey', settings.smsApiKey);
            setVal('setSmsSender', settings.smsSender);
            const smsEnabled = document.getElementById('setSmsEnabled');
            if (smsEnabled) smsEnabled.checked = settings.smsEnabled || false;
            
            setVal('setLegalName', settings.legalName);
            setVal('setInn', settings.inn);
            setVal('setEmail', settings.email);
            setVal('setPhone', settings.phone);
            setVal('setAddress', settings.address);
            setVal('setVk', settings.tg);
        }
        
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                settings.smsApiKey = document.getElementById('setSmsApiKey').value.trim();
                settings.smsSender = document.getElementById('setSmsSender').value.trim();
                settings.smsEnabled = document.getElementById('setSmsEnabled').checked;

                settings.legalName = document.getElementById('setLegalName').value.trim();
                settings.inn = document.getElementById('setInn').value.trim();
                settings.email = document.getElementById('setEmail').value.trim();
                settings.phone = document.getElementById('setPhone').value.trim();
                settings.address = document.getElementById('setAddress').value.trim();
                settings.tg = document.getElementById('setVk').value.trim();
                
                Store.setSettings(settings); 
                DFUtil.toast('Настройки сохранены', 'success');
            });
        }
        
        // --- СТАРТ ---
        async function fetchOrdersFromServer() {
            try {
                const response = await fetch('/api/orders');
                if (response.ok) {
                    const data = await response.json();
                    orders = data; 
                    renderOrders();
                }
            } catch (err) {
                console.error('Ошибка загрузки заказов с сервера:', err);
            }
        }
        
        localStorage.removeItem('df_orders');

        fetchOrdersFromServer(); 
        renderPromos();
        renderUsers();
        loadPageEditor();
        loadSettings();

        document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open')); });
    }
});