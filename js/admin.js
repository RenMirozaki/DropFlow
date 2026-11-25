document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('.admin-page')) return;
    if (!Auth.isAdmin()) { window.location.href = 'login.html'; return; }
    document.getElementById('adminApp').hidden = false;
    document.getElementById('adminApp').style.display = 'grid';
    
    initAdmin();
    
    async function initAdmin() {
        let products = [];
        let orders = [];
        let promos = Store.getPromos();
        let users = Store.getUsers();
        let pages = Store.getPages();
        let settings = Store.getSettings();
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
        const imageFileInput = document.getElementById('imageFile');
        const imageFileName = document.getElementById('imageFileName');
        const imagePathInput = document.getElementById('imagePath');
        const liveEditorContent = document.getElementById('liveEditorContent');
        const savePagesBtn = document.getElementById('savePagesBtn');
        const inputAbout = document.getElementById('editImageAbout');
        const inputHero = document.getElementById('editImageHero');

        userName.textContent = "Администратор";

        if (logoutBtn) logoutBtn.addEventListener('click', () => { if (confirm('Выйти?')) { Auth.logout(); window.location.href = 'index.html'; } });

        // === ЗАГРУЗКА ДАННЫХ ===
        async function loadData() {
            try {
                const resP = await fetch('/api/products');
                products = await resP.json();
                const resO = await fetch('/api/orders');
                orders = await resO.json();
                const resC = await fetch('/api/categories');
                categories = await resC.json();
            } catch (e) { console.error('Ошибка загрузки данных', e); }
            renderProducts();
            renderOrders();
            renderPromos();
            renderUsers();
            loadPageEditor();
            loadSettings();
            updateCategoriesSelect();
        }

        // === КАТЕГОРИИ ===
        function updateCategoriesSelect() {
            const select = document.getElementById('productCategorySelect');
            const list = document.getElementById('categoriesList');
            if (select) {
                select.innerHTML = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
            }
            if (list) {
                list.innerHTML = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
            }
        }

        const addCategoryBtn = document.getElementById('addCategoryBtn');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', async () => {
                const input = document.getElementById('newCategoryInput');
                const name = input.value.trim();
                if (!name) return;
                await fetch('/api/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
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
                        <img src="${DFUtil.escapeHtml(p.image)}" alt="${DFUtil.escapeHtml(p.name)}" onerror="this.src='https://via.placeholder.com/400x400/1a2f26/e8b06a?text=DropFlow';">
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
                        await fetch('/api/products', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ...p, id: p.id, hidden: p.hidden })
                        });
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
                imagePathInput.value = p.image;
                imageFileName.textContent = p.image ? 'Загружено' : '';
                productForm.description.value = p.description || '';
                productModalTitle.textContent = 'Редактирование';
                productModal.classList.add('open');
            };
            window.deleteProduct = async (id) => {
                if (!confirm('Удалить товар?')) return;
                await fetch('/api/products/' + id, { method: 'DELETE' });
                await loadData();
            };
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

        if (imageFileInput) {
            imageFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    imageFileName.textContent = file.name;
                    imagePathInput.value = 'images/' + file.name;
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
                await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
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
            container.innerHTML = list.map(o => `
                <div class="list-item">
                    <div class="list-item-info">
                        <h4>Заказ №${o.id} · ${DFUtil.escapeHtml(o.name)}</h4>
                        <p>${DFUtil.formatPrice(o.total)}</p>
                    </div>
                    <div class="list-actions">
                        <select class="input select status-select" data-order-id="${o.id}">
                            ${Object.entries(statusLabels).map(([val, label]) => `<option value="${val}" ${o.status === val ? 'selected' : ''}>${label}</option>`).join('')}
                        </select>
                    </div>
                </div>
            `).join('');
            container.querySelectorAll('.status-select').forEach(sel => {
                sel.addEventListener('change', async (e) => {
                    await fetch('/api/order/status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: Number(e.target.dataset.orderId), status: e.target.value })
                    });
                    await loadData();
                });
            });
        }

        // === ПРОМОКОДЫ ===
        function renderPromos() {
            const container = document.getElementById('adminPromoList');
            if (!container) return;
            if (promos.length === 0) { container.innerHTML = '<div class="list-empty">Промокодов нет</div>'; return; }
            container.innerHTML = promos.map((p, i) => `
                <div class="list-item">
                    <div class="list-item-info"><h4>${p.code}</h4><p>${p.type === 'percent' ? p.value + '%' : DFUtil.formatPrice(p.value)}</p></div>
                    <div class="list-actions"><button class="icon-btn danger" data-del-promo="${i}">🗑</button></div>
                </div>
            `).join('');
            container.querySelectorAll('[data-del-promo]').forEach(b => b.addEventListener('click', () => {
                promos.splice(Number(b.dataset.delPromo), 1);
                Store.setPromos(promos);
                renderPromos();
            }));
        }

        if (promoForm) {
            promoForm.addEventListener('submit', e => {
                e.preventDefault();
                const fd = new FormData(promoForm);
                promos.push({ code: fd.get('code').toUpperCase(), type: fd.get('type'), value: Number(fd.get('value')) });
                Store.setPromos(promos);
                renderPromos();
                promoModal.classList.remove('open');
            });
        }

        // === ПОЛЬЗОВАТЕЛИ ===
        function renderUsers() {
            const container = document.getElementById('adminUsersList');
            if (!container) return;
            container.innerHTML = users.map(u => `
                <div class="list-item">
                    <div class="list-item-info"><h4>${u.name}</h4><p>@${u.login}</p></div>
                </div>
            `).join('');
        }

        // === СТРАНИЦЫ ===
        function loadPageEditor() { 
            if (!liveEditorContent) return;
            let text = pages[currentPageKey] || '';
            let cleanText = text.replace(/<br\s*[\/]?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '').trim();
            liveEditorContent.innerText = cleanText;
        }

        if (savePagesBtn) {
            savePagesBtn.addEventListener('click', () => {
                let rawText = liveEditorContent.innerText;
                let html = rawText.split(/\n\s*\n/).map(par => par.trim() ? `<p>${par.replace(/\n/g, '<br>')}</p>` : '').join('');
                pages[currentPageKey] = html;
                Store.setPages(pages);
                DFUtil.toast('Страница сохранена', 'success');
            });
        }

        // === НАСТРОЙКИ ===
        function loadSettings() {
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
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

        // Переключение секций
        navItems.forEach(item => item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.toggle('active', i.dataset.section === item.dataset.section));
            sections.forEach(s => s.classList.toggle('active', s.dataset.section === item.dataset.section));
            const titles = { products: 'Товары', orders: 'Все заказы', promo: 'Промокоды', users: 'Пользователи', pages: 'Страницы', settings: 'Настройки' };
            pageTitle.textContent = titles[item.dataset.section] || '';
        }));

        document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => document.getElementById(btn.dataset.close).classList.remove('open')));
        document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); }));

        // Старт
        await loadData();
    }
});