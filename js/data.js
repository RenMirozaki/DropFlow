/* ============================================================
   DropFlow — демо-данные и работа с localStorage
   ============================================================ */

const DF = {
    KEYS: {
        products: 'df_products',
        pages:    'df_pages',
        settings: 'df_settings',
        users:    'df_users',
        orders:   'df_orders',
        promos:   'df_promos',
        cart:     'df_cart',
        fav:      'df_fav',
        session:  'df_session',
        cookie:   'df_cookie_ok',
        seq:      'df_seq'
    }
};

/* ===== Демо-товары (картинки интерьера с Unsplash) ===== */
const DF_DEFAULT_PRODUCTS = [
    {
        id: 1,
        name: 'Кресло Scandinavian',
        price: 18990,
        oldPrice: 24990,
        category: 'Товары для дома',
        rating: 4.8,
        popular: true,
        isNew: false,
        image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&q=80',
        description: 'Мягкое кресло в скандинавском стиле с дубовыми ножками. Идеально для гостиной или кабинета.',
        reviews: [
            { name: 'Анна', rating: 5, text: 'Очень удобное, ткань приятная. Взяла два!' },
            { name: 'Игорь', rating: 5, text: 'Качество отличное, доставили быстро.' }
        ]
    },
    {
        id: 2,
        name: 'Настольная лампа Loft',
        price: 3490,
        category: 'Освещение',
        rating: 4.6,
        popular: true,
        isNew: true,
        image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80',
        description: 'Стильная настольная лампа в лофт-стиле с регулируемым плафоном.',
        reviews: [{ name: 'Мария', rating: 4, text: 'Хорошая лампа, свет мягкий.' }]
    },
    {
        id: 3,
        name: 'Кофемашина DeLonghi',
        price: 24990,
        oldPrice: 29990,
        category: 'Электроника',
        rating: 4.9,
        popular: true,
        isNew: false,
        image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600&q=80',
        description: 'Автоматическая кофемашина для дома. Готовит эспрессо, капучино и латте.',
        reviews: [{ name: 'Дмитрий', rating: 5, text: 'Кофе как в кофейне. Доволен!' }]
    },
    {
        id: 4,
        name: 'Ваза керамическая',
        price: 1490,
        category: 'Декор',
        rating: 4.4,
        popular: false,
        isNew: true,
        image: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=600&q=80',
        description: 'Керамическая ваза ручной работы. Матовая глазурь, нейтральный бежевый оттенок.',
        reviews: []
    },
    {
        id: 5,
        name: 'Подушка декоративная',
        price: 890,
        oldPrice: 1290,
        category: 'Товары для дома',
        rating: 4.7,
        popular: true,
        isNew: false,
        image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&q=80',
        description: 'Декоративная подушка 45×45 см с мягким наполнителем.',
        reviews: [{ name: 'Ольга', rating: 5, text: 'Цвет точно как на фото, мягкая.' }]
    },
    {
        id: 6,
        name: 'Смарт-часы Apple Watch',
        price: 32990,
        category: 'Электроника',
        rating: 4.9,
        popular: true,
        isNew: true,
        image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&q=80',
        description: 'Умные часы с пульсометром, GPS и измерением кислорода в крови.',
        reviews: [{ name: 'Сергей', rating: 5, text: 'Лучшие часы, что у меня были.' }]
    },
    {
        id: 7,
        name: 'Стол обеденный дубовый',
        price: 34990,
        category: 'Товары для дома',
        rating: 4.8,
        popular: false,
        isNew: false,
        image: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=600&q=80',
        description: 'Обеденный стол из массива дуба. Размер 140×80 см, покрыт лаком.',
        reviews: []
    },
    {
        id: 8,
        name: 'Кашпо для растений',
        price: 1190,
        category: 'Декор',
        rating: 4.3,
        popular: false,
        isNew: true,
        image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=80',
        description: 'Керамическое кашпо с поддоном. Диаметр 18 см.',
        reviews: []
    },
    {
        id: 9,
        name: 'Рюкзак кожаный',
        price: 7990,
        oldPrice: 9900,
        category: 'Мода и аксессуары',
        rating: 4.7,
        popular: true,
        isNew: false,
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80',
        description: 'Городской рюкзак из натуральной кожи. Отделение для ноутбука 15".',
        reviews: [{ name: 'Павел', rating: 5, text: 'Кожа качественная, швы ровные.' }]
    },
    {
        id: 10,
        name: 'Наушники Sony WH-1000',
        price: 27990,
        category: 'Электроника',
        rating: 4.9,
        popular: true,
        isNew: false,
        image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&q=80',
        description: 'Беспроводные наушники с активным шумоподавлением. До 30 часов работы.',
        reviews: [{ name: 'Елена', rating: 5, text: 'Шумоподавление на высоте.' }]
    },
    {
        id: 11,
        name: 'Кружка керамическая',
        price: 690,
        category: 'Кухня',
        rating: 4.5,
        popular: false,
        isNew: false,
        image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&q=80',
        description: 'Керамическая кружка 350 мл. Ручная работа, глазурь белого цвета.',
        reviews: []
    },
    {
        id: 12,
        name: 'Торшер напольный',
        price: 8990,
        oldPrice: 11990,
        category: 'Освещение',
        rating: 4.6,
        popular: true,
        isNew: true,
        image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=600&q=80',
        description: 'Напольный торшер с текстильным абажуром. Высота 160 см.',
        reviews: []
    }
];

/* ===== Демо-страницы ===== */
const DF_DEFAULT_PAGES = {
    about: `<h2>О компании DropFlow</h2>
<p>DropFlow — это магазин, где каждая вещь отобрана вручную. Мы работаем напрямую с поставщиками и производителями, поэтому предлагаем честные цены без наценок посредников.</p>
<p>Мы верим, что уютный дом складывается из деталей: правильного света, удобного кресла, любимой кружки. Наша задача — помочь вам найти эти детали.</p>
<p>С 2020 года мы доставили более 15 000 заказов по всей России. Каждый товар проходит проверку качества на нашем складе.</p>
<h3>Наши принципы</h3>
<ul>
<li>Честные цены без скрытых наценок</li>
<li>Только проверенные поставщики</li>
<li>Быстрая доставка и поддержка 24/7</li>
</ul>`,
    privacy: `<h2>Политика конфиденциальности</h2>
<p>Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных данных пользователей сайта DropFlow.</p>
<h3>1. Какие данные мы собираем</h3>
<p>Мы собираем: имя, email, номер телефона, адрес доставки, историю заказов, а также технические данные (cookie, IP-адрес, тип браузера).</p>
<h3>2. Как мы используем данные</h3>
<p>Персональные данные используются для оформления заказов, доставки, отправки SMS-уведомлений и улучшения работы сайта.</p>
<h3>3. Передача третьим лицам</h3>
<p>Мы не передаём данные третьим лицам, кроме случаев, предусмотренных законом (службы доставки, платёжные системы).</p>
<h3>4. Ваши права</h3>
<p>Вы можете запросить удаление или изменение своих данных, написав на artemka.sivyakov2005@gmail.com.</p>`,
    'personal-data': `<h2>Согласие на обработку персональных данных</h2>
<p>Оформляя заказ или регистрируясь на сайте DropFlow, вы даёте согласие на обработку персональных данных в соответствии с ФЗ №152 «О персональных данных».</p>
<h3>Состав данных</h3>
<p>ФИО, email, номер телефона, адрес доставки, история заказов.</p>
<h3>Цели обработки</h3>
<p>Оформление и доставка заказов, отправка SMS-уведомлений, маркетинговые коммуникации (с возможностью отписки).</p>
<h3>Срок действия</h3>
<p>Согласие действует до момента отзыва. Отозвать можно, написав на artemka.sivyakov2005@gmail.com.</p>`,
    delivery: `<h2>Доставка и оплата</h2>
<h3>Способы доставки</h3>
<ul>
<li>Курьером по Северодвинску — 1–2 дня, 300 ₽</li>
<li>СДЭК по России — 2–7 дней, от 350 ₽</li>
<li>Почта России — 5–14 дней, от 250 ₽</li>
<li>Самовывоз со склада — бесплатно</li>
</ul>
<h3>Способы оплаты</h3>
<ul>
<li>Картой онлайн (ЮKassa) — скоро</li>
<li>При получении (наличными или картой курьеру)</li>
<li>По счёту для юридических лиц</li>
</ul>
<h3>Бесплатная доставка</h3>
<p>При заказе от 5000 ₽ доставка по Северодвинску — бесплатно.</p>`,
    offer: `<h2>Публичная оферта</h2>
<p>Настоящий документ является публичной офертой (далее — «Оферта») в соответствии со ст. 437 ГК РФ и определяет условия продажи товаров через сайт DropFlow.</p>
<h3>1. Общие положения</h3>
<p>Продавец: <b>Самозанятый (плательщик НПД) Сивяков Артемий Сергеевич</b> (ИНН: <b>290223956586</b>).</p>
<p>Покупатель — любой дееспособный гражданин, оформивший заказ на Сайте.</p>
<p>Оформление заказа на Сайте означает полное и безоговорочное принятие условий настоящей Оферты.</p>
<h3>2. Товар</h3>
<p>Товар — предметы интерьера, электроника, аксессуары, представленные на Сайте.</p>
<h3>3. Оформление заказа</h3>
<p>Покупатель оформляет заказ через корзину на Сайте, указывая ФИО, телефон, email и адрес доставки.</p>
<h3>4. Оплата и чеки</h3>
<p>Оплата производится онлайн через сервис ЮKassa (карта, СБП) или иным способом, указанным при оформлении. В соответствии с ФЗ №422-ФЗ «О проведении эксперимента по установлению специального налогового режима "Налог на профессиональный доход"», Продавец формирует и направляет Покупателю чек в электронной форме через приложение «Мой налог» после получения оплаты.</p>
<h3>5. Доставка</h3>
<p>Доставка осуществляется через СДЭК или Почту России по всей территории РФ.</p>
<h3>6. Возврат и обмен</h3>
<p>Возврат товара надлежащего качества возможен в течение 14 дней с момента получения.</p>
<h3>7. Реквизиты Продавца</h3>
<p>Самозанятый Сивяков Артемий Сергеевич<br>ИНН: 290223956586<br>Адрес: г. Северодвинск, бульвар Строителей, 17<br>Email: artemka.sivyakov2005@gmail.com<br>Телефон: +7 (902) 054-34-51</p>`
};

/* ===== Настройки сайта ===== */
const DF_DEFAULT_SETTINGS = {
    siteName: 'DropFlow',
    tagline: 'ONLINE STORE',
    email: 'artemka.sivyakov2005@gmail.com',
    phone: '+7 (902) 054-34-51',
    address: 'г. Северодвинск, бульвар Строителей, 17',
    tg: '@mirozak',
    vk: '@mirozak',
    ig: '@dropflow',
    legalName: 'Самозанятый Сивяков Артемий Сергеевич',
    inn: '290223956586',
    smsApiKey: '',
    smsSender: 'DropFlow',
    smsEnabled: false
};

/* ===== Демо-промокоды ===== */
const DF_DEFAULT_PROMOS = [
    { code: 'WELCOME10', type: 'percent', value: 10, minTotal: 0, expires: '2026-12-31' },
    { code: 'FLOW500',   type: 'fixed',   value: 500, minTotal: 3000, expires: '2026-12-31' }
];

/* ===== Демо-пользователи ===== */
const DF_DEFAULT_USERS = [
    { login: 'admin', password: '12345', name: 'Администратор', email: 'admin@dropflow.ru', phone: '+7 (999) 000-00-00', role: 'admin', createdAt: '2025-01-01' },
    { login: 'ivan',  password: 'qwerty', name: 'Иван Петров', email: 'ivan@mail.ru', phone: '+7 (999) 111-22-33', role: 'user', createdAt: '2025-03-15' }
];

/* ===== Демо-заказы ===== */
const DF_DEFAULT_ORDERS = [
    {
        id: 1001,
        userId: 'ivan',
        name: 'Иван Петров',
        phone: '+7 (999) 111-22-33',
        email: 'ivan@mail.ru',
        address: 'Москва, ул. Ленина, 15, кв. 42',
        comment: 'Позвонить за час',
        payment: 'cash',
        items: [
            { id: 1, name: 'Кресло Scandinavian', price: 18990, quantity: 1, image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&q=80' },
            { id: 5, name: 'Подушка декоративная', price: 890, quantity: 2, image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&q=80' }
        ],
        total: 20770,
        discount: 0,
        promo: '',
        status: 'active',
        createdAt: '2025-10-15T14:22:00'
    },
    {
        id: 1002,
        userId: 'ivan',
        name: 'Иван Петров',
        phone: '+7 (999) 111-22-33',
        email: 'ivan@mail.ru',
        address: 'Москва, ул. Ленина, 15, кв. 42',
        comment: '',
        payment: 'card',
        items: [
            { id: 3, name: 'Кофемашина DeLonghi', price: 24990, quantity: 1, image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600&q=80' }
        ],
        total: 22491,
        discount: 2499,
        promo: 'WELCOME10',
        status: 'done',
        createdAt: '2025-09-20T10:05:00'
    }
];

/* ============================================================
   Хранилище (обёртка над localStorage)
   ============================================================ */
const Store = {
    _get(key, def) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return def;
            return JSON.parse(raw);
        } catch (e) {
            console.warn('Store read error:', key, e);
            return def;
        }
    },
    _set(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
            return true;
        } catch (e) {
            console.warn('Store write error:', key, e);
            return false;
        }
    },
    _remove(key) { localStorage.removeItem(key); },

    /* Инициализация дефолтов при первом запуске */
    init() {
        if (!localStorage.getItem(DF.KEYS.products)) this._set(DF.KEYS.products, DF_DEFAULT_PRODUCTS);
        if (!localStorage.getItem(DF.KEYS.pages))    this._set(DF.KEYS.pages, DF_DEFAULT_PAGES);
        if (!localStorage.getItem(DF.KEYS.settings)) this._set(DF.KEYS.settings, DF_DEFAULT_SETTINGS);
        if (!localStorage.getItem(DF.KEYS.users))    this._set(DF.KEYS.users, DF_DEFAULT_USERS);
        if (!localStorage.getItem(DF.KEYS.orders))   this._set(DF.KEYS.orders, DF_DEFAULT_ORDERS);
        if (!localStorage.getItem(DF.KEYS.promos))   this._set(DF.KEYS.promos, DF_DEFAULT_PROMOS);
        if (!localStorage.getItem(DF.KEYS.seq))      this._set(DF.KEYS.seq, { product: 100, order: 2000 });
    },

    /* Товары */
    getProducts()      { return this._get(DF.KEYS.products, []); },
    setProducts(list)  { return this._set(DF.KEYS.products, list); },

    /* Страницы */
    getPages()         { return this._get(DF.KEYS.pages, {}); },
    setPages(p)        { return this._set(DF.KEYS.pages, p); },

    /* Настройки */
    getSettings()      { return this._get(DF.KEYS.settings, DF_DEFAULT_SETTINGS); },
    setSettings(s)     { return this._set(DF.KEYS.settings, s); },

    /* Пользователи */
    getUsers()         { return this._get(DF.KEYS.users, []); },
    setUsers(list)     { return this._set(DF.KEYS.users, list); },

    /* Заказы */
    getOrders()        { return this._get(DF.KEYS.orders, []); },
    setOrders(list)    { return this._set(DF.KEYS.orders, list); },

    /* Промокоды */
    getPromos()        { return this._get(DF.KEYS.promos, []); },
    setPromos(list)    { return this._set(DF.KEYS.promos, list); },

    /* Корзина / избранное */
    getCart()          { return this._get(DF.KEYS.cart, []); },
    setCart(c)         { return this._set(DF.KEYS.cart, c); },

    getFav()           { return this._get(DF.KEYS.fav, []); },
    setFav(f)          { return this._set(DF.KEYS.fav, f); },

    /* Сессия */
    getSession()       { return this._get(DF.KEYS.session, null); },
    setSession(s)      { return this._set(DF.KEYS.session, s); },
    clearSession()     { this._remove(DF.KEYS.session); },

    /* Cookie */
    getCookieOk()      { return localStorage.getItem(DF.KEYS.cookie) === '1'; },
    setCookieOk()      { localStorage.setItem(DF.KEYS.cookie, '1'); },

    /* Последовательности для id */
    nextId(type) {
        const seq = this._get(DF.KEYS.seq, { product: 100, order: 2000 });
        seq[type] = (seq[type] || 0) + 1;
        this._set(DF.KEYS.seq, seq);
        return seq[type];
    }
};

/* Утилиты */
const DFUtil = {
    formatPrice(n) {
        return Number(n || 0).toLocaleString('ru-RU') + ' ₽';
    },
    formatDate(iso) {
        const d = new Date(iso);
        const pad = n => String(n).padStart(2, '0');
        return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },
    escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
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
        setTimeout(() => {
            el.classList.add('hide');
            setTimeout(() => el.remove(), 300);
        }, ms);
    }
};

/* Инициализация при подключении */
Store.init();