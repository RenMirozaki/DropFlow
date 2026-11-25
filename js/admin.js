// admin.js — DropFlow
document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('.admin-page')) return;
    if (!Auth.isAdmin()) { window.location.href = 'login.html'; return; }
    document.getElementById('adminApp').hidden = false;
    document.getElementById('adminApp').style.display = 'grid';

    // Сжатие изображения на клиенте перед загрузкой
    function compressImage(file, maxSide = 1600, quality = 0.85) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                let { width, height } = img;
                const scale = Math.min(1, maxSide / Math.max(width, height));
                width = Math.round(width * scale);
                height = Math.round(height * scale);
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                canvas.toBlob(blob => {
                    URL.revokeObjectURL(url);
                    if (!blob) return reject(new Error('Не удалось сжать изображение'));
                    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
                    resolve(new File([blob], name, { type: 'image/jpeg' }));
                }, 'image/jpeg', quality);
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Не удалось прочитать файл')); };
            img.src = url;
        });
    }

    initAdmin();

    async function initAdmin() {
        let products = [];
        let orders = [];
        let promos = [];
        let users = [];
        let pendingComments = [];
        let currentPageKey = 'about';
        let orderFilter = 'all';
        let categories = [];

        // Элементы
        const navItems = document.querySelectorAll('.admin-nav-item');
        const sections = document.querySelectorAll('.admin-section');
        const pageTitle = document.getElementById('adminPageTitle');
        const userName = document.getElementById('adminUserName');
        const logoutBtn = document.getElementById('logoutBtn');
        const productModal = document.getElementById('productModal');
        const productForm = document.getElementById('productForm');
        const productModalTitle = document.getElementById('productModalTitle');
        const promoModal = document.getElementById('promoModal');
        const promoForm = document.getElementById('promoForm');
        const orderModal = document.getElementById('orderModal');
        const orderModalBody = document.getElementById('orderModalBody');
        const adminProductSearch = document.getElementById('adminProductSearch');
        const addProductBtn = document.getElementById('addProductBtn');
        const liveEditorContent = document.getElementById('liveEditorContent');
        const savePagesBtn = document.getElementById('savePagesBtn');

        userName.textContent = 'Администратор';

        if (logoutBtn) logoutBtn.addEventListener('click', () => { if (confirm('Выйти?')) { Auth.logout(); window.location.href = 'index.html'; } });

        // Универсальный запрос к API с токеном
        async function api(url, options = {}) {
            const res = await fetch(url, Object.assign({}, options, { headers: Object.assign({ 'Content-Type': 'application/json' }, Store.authHeaders(), options.headers || {}) }));
            const data = await res.json().catch(() => ({}));
            if (res.status === 401) { Auth.logout(); window.location.href = 'login.html'; return data; }
            if (res.status === 403) DFUtil.toast('Нет прав администратора', 'error');
            return data;
        }

        // Универсальная загрузка файла с сжатием
        async function uploadFile(file) {
            const compressed = await compressImage(file);
            const fd = new FormData();
            fd.append('file', compressed);
            const res = await fetch('/api/upload', { method: 'POST', headers: Store.authHeaders(), body: fd });
            return res.json();
        }

        // === ЗАГРУЗКА ДАННЫХ ===
        async function loadData() {
            try {
                await Store.refreshServerData();
                const resP = await fetch('/api/products');
                products = await resP.json();
                const resO = await api('/api/orders');
                if (Array.isArray(resO)) orders = resO;
                const resC = await fetch('/api/categories');
                categories = await resC.json();
                const resPromos = await api('/api/promos');
                if (Array.isArray(resPromos)) promos = resPromos;
                const resUsers = await api('/api/users');
                if (Array.isArray(resUsers)) users = resUsers;
                const resComments = await api('/api/comments/pending');
                if (Array.isArray(resComments)) pendingComments = resComments;
            } catch (e) { console.error('Ошибка загрузки данных', e); }
            renderProducts();
            renderOrders();
            renderPromos();
            renderUsers();
            renderCategoriesList();
            loadPageEditor();
            loadSettings();
            loadBanner();
            loadPickup();
            renderPendingComments();
            updateCategoriesSelect();
        }

        // === КАТЕГОРИИ ===
        function updateCategoriesSelect() {
            const select = document.getElementById('productCategorySelect');
            const list = document.getElementById('categoriesList');
            if (select) select.innerHTML = categories.map(c => `<option value="${DFUtil.escapeHtml(c.name)}">${DFUtil.escapeHtml(c.name)}</option>`).join('');
            if (list) list.innerHTML = categories.map(c => `<option value="${DFUtil.escapeHtml(c.name)}">${DFUtil.escapeHtml(c.name)}</option>`).join('');
        }

        function renderCategoriesList() {
            const container = document.getElementById('adminCategoriesList');
            if (!container) return;
            if (categories.length === 0) { container.innerHTML = '<div class="list-empty">Категорий нет</div>'; return; }
            container.innerHTML = categories.map(c => `
                <div class="list-item">
                    <div class="list-item-info"><h4>${DFUtil.escapeHtml(c.name)}</h4></div>
                    <div class="list-actions"><button class="icon-btn danger" data-del-cat="${c.id}">🗑</button></div>
                </div>
            `).join('');
            container.querySelectorAll('[data-del-cat]').forEach(b => b.addEventListener('click', async () => {
                if (!confirm('Удалить категорию? Товары этой категории останутся в базе.')) return;
                await api('/api/categories/' + b.dataset.delCat, { method: 'DELETE' });
                await loadData();
                DFUtil.toast('Категория удалена', 'success');
            }));
        }

        const addCategoryBtn = document.getElementById('addCategoryBtn');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', async () => {
                const input = document.getElementById('newCategoryInput');
                const name = input.value.trim();
                if (!name) return;
                await api('/api/categories', { method: 'POST', body: JSON.stringify({ name }) });
                input.value = '';
                await loadData();
                DFUtil.toast('Категория добавлена', 'success');
            });
        }

        // === ТОВАРЫ ===
        function renderProducts() {
            const q = adminProductSearch ? adminProductSearch.value.trim().toLowerCase() : '';
            const list = products.filter(p => p.name.toLowerCase().includes(q));
            const container = document.getElementById('adminProductsList');
            if (!container) return;
            if (list.length === 0) { container.innerHTML = '<div class="list-empty">Товаров нет.</div>'; return; }

            container.innerHTML = list.map(p => `
                <div class="product-card" style="position:relative;">
                    <div class="toggle-wrapper" title="Скрыть с главной">
                        <input type="checkbox" class="toggle-checkbox" data-hide-toggle="${p.id}" id="toggle-${p.id}" ${p.hidden ? 'checked' : ''}>
                        <label class="toggle-label" for="toggle-${p.id}">Скрыт</label>
                    </div>
                    <div class="product-media">
                        <img src="${DFUtil.escapeHtml(p.image)}" alt="${DFUtil.escapeHtml(p.name)}" onerror="this.onerror=null;this.src='https://via.placeholder.com/400x400/1a2f26/e8b06a?text=DropFlow';">
                    </div>
                    <div class="product-info">
                        <span class="product-category">${DFUtil.escapeHtml(p.category)}</span>
                        <h3 class="product-name">${DFUtil.escapeHtml(p.name)}</h3>
                        <div class="product-price-row"><span class="product-price">${DFUtil.formatPrice(p.price)}</span></div>
                        <div style="display:flex; gap:5px; margin-top:10px;">
                            <button class="btn-ghost" onclick="editProduct(${p.id})" style="flex:1; font-size:11px;">Ред.</button>
                            <button class="btn-ghost" onclick="deleteProduct(${p.id})" style="flex:1; font-size:11px; color:var(--danger);">Удал.</button>
                        </div>
                    </div>
                </div>
            `).join('');

            container.querySelectorAll('[data-hide-toggle]').forEach(toggle => {
                toggle.addEventListener('change', async (e) => {
                    const id = Number(e.target.dataset.hideToggle);
                    const p = products.find(x => x.id === id);
                    if (p) {
                        p.hidden = e.target.checked;
                        await api('/api/products', { method: 'POST', body: JSON.stringify({ ...p, id: p.id, hidden: p.hidden }) });
                        DFUtil.toast(p.hidden ? 'Товар скрыт' : 'Товар виден', 'success', 1500);
                    }
                });
            });

            window.editProduct = (id) => {
                const p = products.find(x => x.id === id);
                if (!p) return;
                productForm.id.value = p.id;
                productForm.name.value = p.name;
                productForm.category.value = p.category;
                productForm.price.value = p.price;
                productForm.oldPrice.value = p.old_price || '';
                productForm.rating.value = p.rating || 5;
                productForm.popular.value = p.popular ? 'yes' : 'no';
                document.getElementById('imagePath').value = p.image || '';
                document.getElementById('imageFileName').textContent = p.image ? 'Загружено' : '';
                productForm.description.value = p.description || '';
                productModalTitle.textContent = 'Редактирование';
                productModal.classList.add('open');
            };
            window.deleteProduct = async (id) => {
                if (!confirm('Удалить товар?')) return;
                await api('/api/products/' + id, { method: 'DELETE' });
                await loadData();
                DFUtil.toast('Товар удалён', 'success');
            };
        }

        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => {
                productForm.reset();
                productForm.id.value = '';
                document.getElementById('imageFileName').textContent = '';
                document.getElementById('imagePath').value = '';
                productModalTitle.textContent = 'Новый товар';
                productModal.classList.add('open');
            });
        }

        // Загрузка фото товара на сервер (со сжатием)
        const imageFileInput = document.getElementById('imageFile');
        if (imageFileInput) {
            imageFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                document.getElementById('imageFileName').textContent = 'Загрузка...';
                try {
                    const data = await uploadFile(file);
                    if (data.success) {
                        document.getElementById('imagePath').value = data.url;
                        document.getElementById('imageFileName').textContent = 'Загружено ✓';
                    } else {
                        document.getElementById('imageFileName').textContent = 'Ошибка загрузки';
                        DFUtil.toast(data.error || 'Не удалось загрузить фото', 'error');
                    }
                } catch (err) {
                    document.getElementById('imageFileName').textContent = 'Ошибка загрузки';
                    DFUtil.toast(err.message || 'Ошибка сжатия', 'error');
                }
            });
        }

        if (productForm) {
            productForm.addEventListener('submit', async e => {
                e.preventDefault();
                const fd = new FormData(productForm);
                const data = {
                    id: fd.get('id') ? Number(fd.get('id')) : null,
                    name: fd.get('name').trim(),
                    category: fd.get('category').trim(),
                    price: Number(fd.get('price').replace(/\D/g, '')),
                    oldPrice: fd.get('oldPrice') ? Number(fd.get('oldPrice').replace(/\D/g, '')) : null,
                    rating: Number(fd.get('rating')) || 5,
                    popular: fd.get('popular') === 'yes',
                    image: fd.get('image').trim(),
                    description: fd.get('description').trim(),
                    hidden: false
                };
                // при редактировании сохраняем текущий hidden
                const existing = products.find(p => p.id === data.id);
                if (existing) data.hidden = existing.hidden;
                await api('/api/products', { method: 'POST', body: JSON.stringify(data) });
                await loadData();
                productModal.classList.remove('open');
                DFUtil.toast('Сохранено', 'success');
            });
        }

        // === ЗАКАЗЫ ===
        function renderOrders() {
            const container = document.getElementById('adminOrdersList');
            if (!container) return;
            let list = orders;
            if (orderFilter === 'done') list = orders.filter(o => o.status === 'done');
            if (orderFilter === 'canceled') list = orders.filter(o => o.status === 'canceled');
            if (list.length === 0) { container.innerHTML = '<div class="list-empty">Заказов нет</div>'; return; }
            const statusLabels = { 'active': 'Оформлен', 'shipped': 'Передан в доставку', 'delivering': 'Доставляется', 'arrived': 'Приехал', 'done': 'Завершён', 'canceled': 'Отменён' };
            const payLabels = { 'pending': '⏳ Не оплачен', 'paid': '✅ Оплачен', 'canceled': '❌ Отменён' };
            container.innerHTML = list.map(o => `
                <div class="list-item">
                    <div class="list-item-info">
                        <h4>Заказ №${o.id} · ${DFUtil.escapeHtml(o.name)}</h4>
                        <p><b>${DFUtil.formatPrice(o.total)}</b> <span class="tag ${o.payment_status === 'paid' ? 'done' : 'new'}">${payLabels[o.payment_status] || '⏳ Не оплачен'}</span> ${DFUtil.escapeHtml(o.address)}</p>
                    </div>
                    <div class="list-actions">
                        <button class="icon-btn" data-view-order="${o.id}" title="Подробнее">👁</button>
                        <select class="input select status-select" data-order-id="${o.id}">
                            ${Object.entries(statusLabels).map(([val, label]) => `<option value="${val}" ${o.status === val ? 'selected' : ''}>${label}</option>`).join('')}
                        </select>
                    </div>
                </div>
            `).join('');
            container.querySelectorAll('.status-select').forEach(sel => {
                sel.addEventListener('change', async (e) => {
                    await api('/api/order/status', { method: 'POST', body: JSON.stringify({ id: Number(e.target.dataset.orderId), status: e.target.value }) });
                    await loadData();
                });
            });
            container.querySelectorAll('[data-view-order]').forEach(b => b.addEventListener('click', () => openOrderView(Number(b.dataset.viewOrder))));
        }

        function openOrderView(id) {
            const o = orders.find(x => x.id === id);
            if (!o || !orderModalBody) return;
            let items = [];
            try { items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []); } catch (e) { items = []; }
            orderModalBody.innerHTML = `
                <h4>${DFUtil.escapeHtml(o.name)}</h4>
                <p>📞 ${DFUtil.escapeHtml(o.phone)}</p>
                <p>📧 ${DFUtil.escapeHtml(o.email || '—')}</p>
                <p>📍 ${DFUtil.escapeHtml(o.address)}</p>
                <p>💳 ${o.payment_status === 'paid' ? 'Оплачен' : 'Не оплачен'} · ${DFUtil.formatPrice(o.total)}</p>
                <div style="border-top:1px solid var(--border); margin:14px 0; padding-top:14px;">
                    ${items.map(i => `<div style="display:flex; justify-content:space-between; padding:4px 0;"><span>${DFUtil.escapeHtml(i.name)} × ${i.quantity}</span><b>${DFUtil.formatPrice(i.price * i.quantity)}</b></div>`).join('')}
                </div>
            `;
            orderModal.classList.add('open');
        }

        document.querySelectorAll('[data-order-filter]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-order-filter]').forEach(x => x.classList.remove('active'));
                btn.classList.add('active');
                orderFilter = btn.dataset.orderFilter;
                renderOrders();
            });
        });

        // === ПРОМОКОДЫ ===
        function renderPromos() {
            const container = document.getElementById('adminPromoList');
            if (!container) return;
            if (promos.length === 0) { container.innerHTML = '<div class="list-empty">Промокодов нет</div>'; return; }
            container.innerHTML = promos.map(p => `
                <div class="list-item">
                    <div class="list-item-info"><h4>${DFUtil.escapeHtml(p.code)}</h4><p>${p.type === 'percent' ? p.value + '%' : DFUtil.formatPrice(p.value)}</p></div>
                    <div class="list-actions"><button class="icon-btn danger" data-del-promo="${p.id}">🗑</button></div>
                </div>
            `).join('');
            container.querySelectorAll('[data-del-promo]').forEach(b => b.addEventListener('click', async () => {
                await api('/api/promos/' + b.dataset.delPromo, { method: 'DELETE' });
                await loadData();
            }));
        }

        if (promoForm) {
            promoForm.addEventListener('submit', async e => {
                e.preventDefault();
                const fd = new FormData(promoForm);
                await api('/api/promos', { method: 'POST', body: JSON.stringify({ code: fd.get('code'), type: fd.get('type'), value: Number(fd.get('value')) }) });
                await loadData();
                promoModal.classList.remove('open');
                DFUtil.toast('Промокод сохранён', 'success');
            });
        }

        // === ПОЛЬЗОВАТЕЛИ ===
        function renderUsers() {
            const container = document.getElementById('adminUsersList');
            if (!container) return;
            if (users.length === 0) { container.innerHTML = '<div class="list-empty">Пользователей нет</div>'; return; }
            container.innerHTML = users.map(u => `
                <div class="list-item">
                    <div class="list-item-info"><h4>${DFUtil.escapeHtml(u.name)}</h4><p>@${DFUtil.escapeHtml(u.login)}${u.role === 'admin' ? ' · админ' : ''} · ${DFUtil.escapeHtml(u.email || '')}</p></div>
                </div>
            `).join('');
        }

        // === БАННЕР (картинка с текстом) ===
        function loadBanner() {
            const s = Store.getSettings();
            const el = document.getElementById('bannerImageName');
            if (el) el.textContent = s.bannerImage ? 'Загружено ✓' : '';
        }

        const bannerFileInput = document.getElementById('bannerImage');
        if (bannerFileInput) {
            bannerFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                document.getElementById('bannerImageName').textContent = 'Загрузка...';
                try {
                    const data = await uploadFile(file);
                    if (data.success) {
                        const s = Store.getSettings();
                        s.bannerImage = data.url;
                        await Store.saveSettings(s);
                        document.getElementById('bannerImageName').textContent = 'Загружено ✓';
                        DFUtil.toast('Баннер обновлён', 'success');
                    } else DFUtil.toast(data.error || 'Ошибка загрузки', 'error');
                } catch (err) {
                    document.getElementById('bannerImageName').textContent = 'Ошибка загрузки';
                    DFUtil.toast(err.message || 'Ошибка сжатия', 'error');
                }
            });
        }

        // === ФОНЫ СТРАНИЦ (о нас / hero) ===
        const bgInputs = [
            { input: 'editImageAbout', key: 'aboutImage', label: 'aboutImageName' },
            { input: 'editImageHero', key: 'heroImage', label: 'heroImageName' }
        ];
        bgInputs.forEach(cfg => {
            const inp = document.getElementById(cfg.input);
            if (!inp) return;
            const label = document.getElementById(cfg.label);
            if (label) label.textContent = Store.getSettings()[cfg.key] ? 'Загружено ✓' : '';
            inp.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                    const data = await uploadFile(file);
                    if (data.success) {
                        const s = Store.getSettings();
                        s[cfg.key] = data.url;
                        await Store.saveSettings(s);
                        if (label) label.textContent = 'Загружено ✓';
                        DFUtil.toast('Фон обновлён', 'success');
                    } else DFUtil.toast(data.error || 'Ошибка загрузки', 'error');
                } catch (err) {
                    DFUtil.toast(err.message || 'Ошибка сжатия', 'error');
                }
            });
        });

        // === СТРАНИЦЫ ===
        function loadPageEditor() {
            if (!liveEditorContent) return;
            let text = Store.getPages()[currentPageKey] || '';
            let cleanText = text.replace(/<br\s*[\/]?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '').trim();
            liveEditorContent.innerText = cleanText;
        }

        document.querySelectorAll('[data-page-editor]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-page-editor]').forEach(x => x.classList.remove('active'));
                btn.classList.add('active');
                currentPageKey = btn.dataset.pageEditor;
                loadPageEditor();
            });
        });

        if (savePagesBtn) {
            savePagesBtn.addEventListener('click', async () => {
                let rawText = liveEditorContent.innerText;
                let html = rawText.split(/\n\s*\n/).map(par => par.trim() ? `<p>${par.replace(/\n/g, '<br>')}</p>` : '').join('');
                await Store.savePage(currentPageKey, html);
                DFUtil.toast('Страница сохранена', 'success');
            });
        }

        // === ТОЧКИ ВЫДАЧИ СДЭК ===
        async function loadPickup() {
            const container = document.getElementById('pickupList');
            if (!container) return;
            try {
                const points = await (await fetch('/api/pickup')).json();
                if (points.length === 0) { container.innerHTML = '<div class="list-empty">Точек выдачи нет</div>'; return; }
                container.innerHTML = points.map(p => `
                    <div class="list-item">
                        <div class="list-item-info"><h4>${DFUtil.escapeHtml(p.city || '')} · ${DFUtil.escapeHtml(p.name)}</h4><p>${DFUtil.escapeHtml(p.address)}</p></div>
                        <div class="list-actions"><button class="icon-btn danger" data-del-pickup="${p.id}">🗑</button></div>
                    </div>
                `).join('');
                container.querySelectorAll('[data-del-pickup]').forEach(b => b.addEventListener('click', async () => {
                    await api('/api/pickup/' + b.dataset.delPickup, { method: 'DELETE' });
                    await loadPickup();
                }));
            } catch (e) { container.innerHTML = '<div class="list-empty">Ошибка загрузки</div>'; }
        }

        const pickupForm = document.getElementById('pickupForm');
        if (pickupForm) {
            pickupForm.addEventListener('submit', async e => {
                e.preventDefault();
                const fd = new FormData(pickupForm);
                await api('/api/pickup', { method: 'POST', body: JSON.stringify({ name: fd.get('name'), address: fd.get('address'), city: fd.get('city'), lat: fd.get('lat'), lng: fd.get('lng') }) });
                pickupForm.reset();
                await loadPickup();
                DFUtil.toast('Точка добавлена', 'success');
            });
        }

        const pickupBulkBtn = document.getElementById('pickupBulkBtn');
        if (pickupBulkBtn) {
            pickupBulkBtn.addEventListener('click', async () => {
                const text = document.getElementById('pickupBulkText').value;
                if (!text.trim()) return DFUtil.toast('Вставьте список точек', 'warning');
                const data = await api('/api/pickup/bulk', { method: 'POST', body: JSON.stringify({ text }) });
                if (data.success) { DFUtil.toast('Загружено, всего точек: ' + data.total, 'success'); document.getElementById('pickupBulkText').value = ''; await loadPickup(); }
                else DFUtil.toast(data.error || 'Ошибка загрузки', 'error');
            });
        }

        // === МОДЕРАЦИЯ КОММЕНТАРИЕВ ===
        function renderPendingComments() {
            const container = document.getElementById('pendingCommentsList');
            if (!container) return;
            if (pendingComments.length === 0) { container.innerHTML = '<div class="list-empty">Новых комментариев нет</div>'; return; }
            container.innerHTML = pendingComments.map(c => `
                <div class="list-item">
                    <div class="list-item-info">
                        <h4>${DFUtil.escapeHtml(c.user_name)} · ${DFUtil.escapeHtml(c.product_name || 'товар #' + c.product_id)}</h4>
                        <p>${DFUtil.escapeHtml(c.text)}</p>
                    </div>
                    <div class="list-actions">
                        <button class="icon-btn" data-approve-comment="${c.id}" title="Опубликовать">✓</button>
                        <button class="icon-btn danger" data-reject-comment="${c.id}" title="Отклонить">✕</button>
                    </div>
                </div>
            `).join('');
            container.querySelectorAll('[data-approve-comment]').forEach(b => b.addEventListener('click', async () => {
                await api('/api/comments/moderate', { method: 'POST', body: JSON.stringify({ id: Number(b.dataset.approveComment), action: 'approve' }) });
                pendingComments = pendingComments.filter(c => c.id !== Number(b.dataset.approveComment));
                renderPendingComments();
                DFUtil.toast('Комментарий опубликован', 'success');
            }));
            container.querySelectorAll('[data-reject-comment]').forEach(b => b.addEventListener('click', async () => {
                await api('/api/comments/moderate', { method: 'POST', body: JSON.stringify({ id: Number(b.dataset.rejectComment), action: 'reject' }) });
                pendingComments = pendingComments.filter(c => c.id !== Number(b.dataset.rejectComment));
                renderPendingComments();
                DFUtil.toast('Комментарий отклонён', 'info');
            }));
        }

        // === НАСТРОЙКИ ===
        function loadSettings() {
            const s = Store.getSettings();
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
            setVal('setLegalName', s.legalName);
            setVal('setInn', s.inn);
            setVal('setEmail', s.email);
            setVal('setPhone', s.phone);
            setVal('setAddress', s.address);
            setVal('setVk', s.tg);
        }

        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', async () => {
                await Store.saveSettings({
                    legalName: document.getElementById('setLegalName').value.trim(),
                    inn: document.getElementById('setInn').value.trim(),
                    email: document.getElementById('setEmail').value.trim(),
                    phone: document.getElementById('setPhone').value.trim(),
                    address: document.getElementById('setAddress').value.trim(),
                    tg: document.getElementById('setVk').value.trim()
                });
                DFUtil.toast('Настройки сохранены', 'success');
            });
        }

        // Переключение секций
        navItems.forEach(item => item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.toggle('active', i.dataset.section === item.dataset.section));
            sections.forEach(s => s.classList.toggle('active', s.dataset.section === item.dataset.section));
            const titles = { products: 'Товары', orders: 'Все заказы', promo: 'Промокоды', users: 'Пользователи', pickup: 'Точки выдачи СДЭК', comments: 'Комментарии', pages: 'Страницы', settings: 'Настройки' };
            pageTitle.textContent = titles[item.dataset.section] || '';
        }));

        document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => document.getElementById(btn.dataset.close).classList.remove('open')));
        document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); }));

        // Старт
        await loadData();
    }
});
