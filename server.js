// server.js — DropFlow
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('./database');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const bcrypt = require('bcrypt');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));

const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, message: 'Слишком много запросов с вашего IP, попробуйте позже.' });
app.use('/api/', generalLimiter);

const orderLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 10, message: 'Слишком много попыток оформления заказа. Подождите немного.' });

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '/')));

// ================= ХЕЛПЕРЫ =================

const SECRET = process.env.SESSION_SECRET || 'dropflow-change-me';
function signToken(login) {
    const sig = crypto.createHmac('sha256', SECRET).update(login).digest('hex');
    return login + '.' + sig;
}
function parseToken(token) {
    if (!token || !token.includes('.')) return null;
    const idx = token.lastIndexOf('.');
    const login = token.slice(0, idx), sig = token.slice(idx + 1);
    const expect = crypto.createHmac('sha256', SECRET).update(login).digest('hex');
    return sig === expect ? login : null;
}
function authHeader(req) {
    const h = req.headers['authorization'] || '';
    return h.startsWith('Bearer ') ? h.slice(7) : req.headers['x-token'];
}
async function getUser(req) {
    const login = parseToken(authHeader(req));
    if (!login) return null;
    const r = await db.query('SELECT * FROM users WHERE login = $1', [login]);
    return r.rows[0] || null;
}
async function requireAdmin(req, res, next) {
    const user = await getUser(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Доступ только для администратора' });
    req.user = user;
    next();
}
async function requireUser(req, res, next) {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Требуется вход' });
    req.user = user;
    next();
}

// Загрузка файлов
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, imagesDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, Date.now() + '-' + crypto.randomBytes(4).toString('hex') + ext);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (/\.(jpe?g|png|gif|webp|svg)$/i.test(file.originalname)) cb(null, true);
        else cb(new Error('Разрешены только изображения'));
    }
});

async function tgNotify(text) {
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const tgChatId = process.env.TELEGRAM_CHAT_ID;
    if (!tgToken || !tgChatId) return;
    try {
        await axios.post(`https://api.telegram.org/bot${tgToken}/sendMessage`, { chat_id: tgChatId, text, parse_mode: 'Markdown' });
    } catch (e) { console.error('❌ Ошибка Telegram:', e.message); }
}

// ================= АВТОРИЗАЦИЯ =================

app.post('/api/auth/register', [
    body('login').trim().isLength({ min: 3 }).withMessage('Логин минимум 3 символа').matches(/^[a-zA-Z0-9_]+$/).withMessage('Логин: только латиница, цифры и _'),
    body('password').isLength({ min: 6 }).withMessage('Пароль минимум 6 символов'),
    body('name').trim().isLength({ min: 5 }).withMessage('Укажите ФИО полностью'),
    body('email').trim().isEmail().withMessage('Некорректный email'),
    body('phone').trim().isLength({ min: 10 }).withMessage('Укажите телефон')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, error: errors.array()[0].msg });
    try {
        const { login, password, name, email, phone } = req.body;
        const exists = await db.query('SELECT id FROM users WHERE login = $1 OR email = $2', [login.toLowerCase(), email.toLowerCase()]);
        if (exists.rows.length) return res.status(400).json({ success: false, error: 'Логин или email уже заняты' });
        const hash = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (login, password_hash, name, email, phone, role) VALUES ($1,$2,$3,$4,$5,$6)',
            [login.toLowerCase(), hash, name, email.toLowerCase(), phone, 'user']);
        res.json({ success: true, token: signToken(login.toLowerCase()), user: { login: login.toLowerCase(), name, email, phone, role: 'user' } });
    } catch (err) { res.status(500).json({ success: false, error: 'Ошибка сервера' }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { login, password } = req.body;
        const key = String(login || '').trim().toLowerCase();
        const r = await db.query('SELECT * FROM users WHERE login = $1 OR email = $1', [key]);
        const user = r.rows[0];
        if (!user) return res.status(401).json({ success: false, error: 'Пользователь не найден' });
        const ok = await bcrypt.compare(String(password || ''), user.password_hash);
        if (!ok) return res.status(401).json({ success: false, error: 'Неверный пароль' });
        res.json({ success: true, token: signToken(user.login),
            user: { login: user.login, name: user.name, email: user.email, phone: user.phone, role: user.role } });
    } catch (err) { res.status(500).json({ success: false, error: 'Ошибка сервера' }); }
});

app.get('/api/auth/me', async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ success: false });
    res.json({ success: true, user: { login: user.login, name: user.name, email: user.email, phone: user.phone, role: user.role } });
});

// ================= ТОВАРЫ =================

app.get('/api/products', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM products ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', requireAdmin, async (req, res) => {
    const { id, name, category, price, oldPrice, rating, popular, image, description, hidden } = req.body;
    try {
        if (id) {
            await db.query(`UPDATE products SET name=$1, category=$2, price=$3, old_price=$4, rating=$5, popular=$6, image=$7, description=$8, hidden=$9 WHERE id=$10`,
                [name, category, price, oldPrice, rating, popular, image, description, hidden, id]);
        } else {
            await db.query(`INSERT INTO products (name, category, price, old_price, rating, popular, image, description, hidden)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                [name, category, price, oldPrice, rating, popular, image, description, hidden]);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================= КАТЕГОРИИ =================

app.get('/api/categories', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM categories ORDER BY name');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/categories', requireAdmin, async (req, res) => {
    try {
        await db.query('INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING', [String(req.body.name).trim()]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/categories/:id', requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================= ЗАГРУЗКА ФАЙЛОВ =================

app.post('/api/upload', requireAdmin, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: 'Файл не получен' });
    res.json({ success: true, url: '/images/' + req.file.filename });
});

// ================= ПРОМОКОДЫ =================

app.get('/api/promos', requireAdmin, async (req, res) => {
    try { res.json((await db.query('SELECT * FROM promos ORDER BY id')).rows); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/promo/check', async (req, res) => {
    try {
        const { code, subtotal } = req.body;
        const r = await db.query('SELECT * FROM promos WHERE UPPER(code) = UPPER($1)', [String(code || '').trim()]);
        const promo = r.rows[0];
        if (!promo) return res.json({ success: false, error: 'Промокод не найден' });
        let discount = promo.type === 'percent' ? Math.round(subtotal * promo.value / 100) : Math.min(promo.value, subtotal);
        res.json({ success: true, promo: { code: promo.code, type: promo.type, value: promo.value }, discount });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/promos', requireAdmin, async (req, res) => {
    try {
        const { code, type, value } = req.body;
        await db.query('INSERT INTO promos (code, type, value) VALUES ($1,$2,$3) ON CONFLICT (code) DO UPDATE SET type=$2, value=$3',
            [String(code).toUpperCase().trim(), type, Number(value)]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/promos/:id', requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM promos WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================= СТРАНИЦЫ, НАСТРОЙКИ =================

app.get('/api/pages', async (req, res) => {
    try {
        const r = await db.query('SELECT key, content FROM pages');
        const out = {};
        r.rows.forEach(row => out[row.key] = row.content);
        res.json(out);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/pages', requireAdmin, async (req, res) => {
    try {
        const { key, content } = req.body;
        await db.query(`INSERT INTO pages (key, content) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET content=$2`, [key, content]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/settings', async (req, res) => {
    try {
        const r = await db.query('SELECT key, value FROM settings');
        const out = {};
        r.rows.forEach(row => out[row.key] = row.value);
        res.json(out);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/settings', requireAdmin, async (req, res) => {
    try {
        const entries = Object.entries(req.body || {});
        for (const [key, value] of entries) {
            await db.query(`INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2`, [key, String(value ?? '')]);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================= ЗАКАЗЫ =================

// Пункт 3: Пересчет суммы на сервере
app.post('/api/order', orderLimiter, [
    body('name').trim().isLength({ min: 3 }).withMessage('Укажите ФИО').matches(/^[а-яА-ЯёЁa-zA-Z\s]+$/).withMessage('ФИО должно содержать только буквы'),
    body('phone').trim().isLength({ min: 10 }).withMessage('Укажите телефон'),
    body('address').trim().isLength({ min: 5 }).withMessage('Укажите адрес доставки или пункт выдачи'),
    body('items').isArray({ min: 1 }).withMessage('Корзина пуста'),
    body('promoCode').optional().trim()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
        const { name, phone, email, address, items, comment, promoCode } = req.body;
        const user = await getUser(req);

        // Пересчитываем сумму на основе актуальных цен из БД
        let calculatedTotal = 0;
        const validItems = [];

        for (const item of items) {
            const p = await db.query('SELECT id, name, price, image FROM products WHERE id = $1 AND hidden = false', [item.id]);
            if (p.rows.length === 0) return res.status(400).json({ success: false, error: `Товар "${item.name}" больше не доступен` });
            
            const product = p.rows[0];
            const qty = Math.max(1, Number(item.quantity) || 1);
            calculatedTotal += product.price * qty;
            validItems.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: qty
            });
        }

        // Применяем промокод на сервере
        if (promoCode) {
            const r = await db.query('SELECT * FROM promos WHERE UPPER(code) = UPPER($1)', [promoCode.trim()]);
            const promo = r.rows[0];
            if (promo) {
                let discount = promo.type === 'percent' ? Math.round(calculatedTotal * promo.value / 100) : Math.min(promo.value, calculatedTotal);
                calculatedTotal = Math.max(0, calculatedTotal - discount);
            }
        }

        const result = await db.query(
            `INSERT INTO orders (name, phone, email, address, comment, items, total, status, payment_status, user_login)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
            [name, phone, email || (user ? user.email : null), address, comment || null, JSON.stringify(validItems), calculatedTotal, 'active', 'pending', user ? user.login : null]);
        const orderId = result.rows[0].id;
        
        console.log(`🛒 Новый заказ №${orderId} от ${name} на сумму ${calculatedTotal} ₽`);
        await tgNotify(`🛒 *Новый заказ №${orderId}*\n\n👤 ${name}\n📞 ${phone}\n📍 ${address}\n💰 Сумма: ${calculatedTotal} ₽`);
        
        res.status(200).json({ success: true, orderId, total: calculatedTotal });
    } catch (err) {
        console.error('Ошибка сохранения заказа:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.get('/api/orders', requireAdmin, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM orders ORDER BY id DESC');
        res.status(200).json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.get('/api/orders/my', requireUser, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM orders WHERE user_login = $1 ORDER BY id DESC', [req.user.login]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.post('/api/order/status', requireAdmin, async (req, res) => {
    try {
        const { id, status } = req.body;
        const allowed = ['active', 'shipped', 'delivering', 'arrived', 'done', 'canceled'];
        if (!allowed.includes(status)) return res.status(400).json({ success: false, error: 'Неверный статус' });
        await db.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
        res.status(200).json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ================= ЮKASSA =================

// Шаг 1: создать платёж по сохранённому заказу (Пункт 2: Чеки 54-ФЗ)
app.post('/api/pay', orderLimiter, async (req, res) => {
    try {
        const { orderId } = req.body;
        const r = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
        const order = r.rows[0];
        if (!order) return res.status(404).json({ success: false, error: 'Заказ не найден' });
        if (order.payment_status === 'paid') return res.status(400).json({ success: false, error: 'Заказ уже оплачен' });

        const shopId = process.env.YOOKASSA_SHOP_ID;
        const secretKey = process.env.YOOKASSA_SECRET_KEY;
        if (!shopId || !secretKey) return res.status(500).json({ success: false, error: 'ЮKassa не настроена' });

        const host = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
        const idempKey = crypto.randomUUID();
        
        // Формируем чек (54-ФЗ)
        let items = [];
        try { items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items; } catch(e) {}
        
        const receiptItems = items.map(item => ({
            description: item.name.substring(0, 128),
            quantity: String(item.quantity),
            amount: { value: Number(item.price).toFixed(2), currency: 'RUB' },
            vat_code: 1, // 1 = без НДС
            payment_subject: 'commodity',
            payment_mode: 'full_payment'
        }));

        const payload = {
            amount: { value: Number(order.total).toFixed(2), currency: 'RUB' },
            capture: true,
            confirmation: { type: 'redirect', return_url: `${host}/payment.html?orderId=${order.id}` },
            description: `Заказ №${order.id} — DropFlow`,
            metadata: { order_id: String(order.id) },
            receipt: {
                customer: { 
                    email: order.email || 'guest@dropflow.ru',
                    phone: order.phone
                },
                items: receiptItems
            }
        };

        const resp = await axios.post('https://api.yookassa.ru/v3/payments', payload, {
            auth: { username: shopId, password: secretKey },
            headers: { 'Idempotence-Key': idempKey, 'Content-Type': 'application/json' }
        });
        const payment = resp.data;
        await db.query('UPDATE orders SET yookassa_payment_id = $1 WHERE id = $2', [payment.id, order.id]);
        res.json({ success: true, confirmation_url: payment.confirmation && payment.confirmation.confirmation_url });
    } catch (err) {
        console.error('Ошибка ЮKassa:', err.response ? err.response.data : err.message);
        res.status(500).json({ success: false, error: 'Ошибка создания платежа' });
    }
});

// Шаг 2: вебхук от ЮKassa (Пункт 1: Проверка подлинности)
app.post('/api/yookassa/webhook', express.json({ type: '*/*' }), async (req, res) => {
    try {
        const event = req.body;
        if (!event.object || !event.object.id) return res.status(400).send('Bad Request');

        const paymentId = event.object.id;
        const orderId = event.object.metadata && event.object.metadata.order_id;

        // Проверяем подлинность: делаем запрос к API ЮKassa
        const shopId = process.env.YOOKASSA_SHOP_ID;
        const secretKey = process.env.YOOKASSA_SECRET_KEY;
        if (!shopId || !secretKey) return res.status(500).send('Config Error');

        const check = await axios.get(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
            auth: { username: shopId, password: secretKey }
        });
        
        const realPayment = check.data;

        if (realPayment.status === 'succeeded' && orderId) {
            await db.query(`UPDATE orders SET payment_status='paid' WHERE id=$1 AND (yookassa_payment_id=$2 OR yookassa_payment_id IS NULL)`, [orderId, paymentId]);
            await tgNotify(`✅ Заказ №${orderId} — оплата подтверждена ЮKassa`);
        } else if (realPayment.status === 'canceled' && orderId) {
            await db.query(`UPDATE orders SET payment_status='canceled' WHERE id=$1`, [orderId]);
        }
        
        res.status(200).send('ok');
    } catch (err) {
        console.error('Webhook error:', err.message);
        res.status(500).send('error');
    }
});

app.get('/api/payment-status/:orderId', async (req, res) => {
    try {
        const r = await db.query('SELECT id, total, status, payment_status FROM orders WHERE id = $1', [req.params.orderId]);
        if (!r.rows[0]) return res.status(404).json({ success: false });
        res.json({ success: true, order: r.rows[0] });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ================= ТОЧКИ ВЫДАЧИ =================

app.get('/api/pickup', async (req, res) => {
    try {
        const r = await db.query('SELECT * FROM pickup_points ORDER BY city, name');
        res.json(r.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/pickup', requireAdmin, async (req, res) => {
    try {
        const { name, address, city, lat, lng } = req.body;
        await db.query('INSERT INTO pickup_points (name, address, city, lat, lng) VALUES ($1,$2,$3,$4,$5)',
            [name, address, city, lat ? Number(lat) : null, lng ? Number(lng) : null]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/pickup/bulk', requireAdmin, async (req, res) => {
    try {
        let items = req.body.items || [];
        if (req.body.text) {
            items = req.body.text.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
                const parts = line.split(/[;,\t]/).map(s => s.trim());
                return { city: parts[0], name: parts[1], address: parts[2], lat: parts[3] || null, lng: parts[4] || null };
            });
        }
        for (const it of items) {
            if (!it.city || !it.address) continue;
            await db.query('INSERT INTO pickup_points (name, address, city, lat, lng) VALUES ($1,$2,$3,$4,$5)',
                [it.name || 'Пункт выдачи СДЭК', it.address, it.city, it.lat ? Number(it.lat) : null, it.lng ? Number(it.lng) : null]);
        }
        const c = await db.query('SELECT COUNT(*) FROM pickup_points');
        res.json({ success: true, total: Number(c.rows[0].count) });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/pickup/:id', requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM pickup_points WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================= КОММЕНТАРИИ =================

app.get('/api/comments', async (req, res) => {
    try {
        const productId = req.query.productId;
        let rows;
        if (productId) rows = (await db.query('SELECT id, product_id, user_name, text, created_at FROM comments WHERE approved = true AND product_id = $1 ORDER BY id DESC', [productId])).rows;
        else rows = (await db.query('SELECT id, product_id, user_name, text, created_at FROM comments WHERE approved = true ORDER BY id DESC LIMIT 100')).rows;
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/comments', requireUser, [
    body('text').trim().isLength({ min: 3, max: 1000 }).withMessage('Комментарий 3–1000 символов')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, error: errors.array()[0].msg });
    try {
        const { productId, text } = req.body;
        await db.query('INSERT INTO comments (product_id, user_login, user_name, text, approved) VALUES ($1,$2,$3,$4,false)',
            [productId, req.user.login, req.user.name, text]);
        res.json({ success: true, message: 'Комментарий отправлен на модерацию' });
    } catch (err) { res.status(500).json({ success: false, error: 'Ошибка сервера' }); }
});

app.get('/api/comments/pending', requireAdmin, async (req, res) => {
    try {
        const r = await db.query(`SELECT c.*, p.name AS product_name FROM comments c LEFT JOIN products p ON p.id = c.product_id WHERE c.approved = false ORDER BY c.id DESC`);
        res.json(r.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/comments/moderate', requireAdmin, async (req, res) => {
    try {
        const { id, action } = req.body;
        if (action === 'approve') await db.query('UPDATE comments SET approved = true WHERE id = $1', [id]);
        else await db.query('DELETE FROM comments WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================= ПОЛЬЗОВАТЕЛИ =================

app.get('/api/users', requireAdmin, async (req, res) => {
    try {
        const r = await db.query('SELECT login, name, email, phone, role, created_at FROM users ORDER BY id');
        res.json(r.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================= ОБРАБОТЧИК ОШИБОК =================

app.use((err, req, res, next) => {
    console.error('Ошибка запроса:', err.message);
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, error: 'Файл больше 5 МБ' });
    if (res.headersSent) return next(err);
    res.status(500).json({ success: false, error: 'Ошибка загрузки: ' + err.message });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});