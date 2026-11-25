const express = require('express');
const path = require('path');
const db = require('./database');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Слишком много запросов с вашего IP, попробуйте позже.'
});
app.use('/api/', generalLimiter);

const orderLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: 'Слишком много попыток оформления заказа. Подождите немного.'
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// === API: ТОВАРЫ ===
app.get('/api/products', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM products ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    const { id, name, category, price, oldPrice, rating, popular, image, description, hidden } = req.body;
    try {
        if (id) {
            await db.query(
                `UPDATE products SET name=$1, category=$2, price=$3, old_price=$4, rating=$5, popular=$6, image=$7, description=$8, hidden=$9 WHERE id=$10`,
                [name, category, price, oldPrice, rating, popular, image, description, hidden, id]
            );
        } else {
            await db.query(
                `INSERT INTO products (name, category, price, old_price, rating, popular, image, description, hidden) 
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                [name, category, price, oldPrice, rating, popular, image, description, hidden]
            );
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === API: КАТЕГОРИИ ===
app.get('/api/categories', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM categories ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/categories', async (req, res) => {
    try {
        await db.query('INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING', [req.body.name]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === API: ЗАКАЗЫ ===
app.post('/api/order', orderLimiter, [
    body('name').trim().isLength({ min: 3 }).withMessage('Укажите ФИО').matches(/^[а-яА-ЯёЁa-zA-Z\s]+$/).withMessage('ФИО должно содержать только буквы'),
    body('phone').trim().isLength({ min: 10 }).withMessage('Укажите телефон'),
    body('address').trim().isLength({ min: 5 }).withMessage('Укажите адрес'),
    body('total').isInt({ min: 1 }).withMessage('Неверная сумма заказа')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const { name, phone, email, address, comment, items, total } = req.body;

        const result = await db.query(
            `INSERT INTO orders (name, phone, email, address, comment, items, total, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [name, phone, email, address, comment, JSON.stringify(items), total, 'active']
        );

        const orderId = result.rows[0].id;
        console.log(`🛒 Новый заказ №${orderId} от ${name} на сумму ${total} ₽`);

        const tgToken = process.env.TELEGRAM_BOT_TOKEN;
        const tgChatId = process.env.TELEGRAM_CHAT_ID;

        if (tgToken && tgChatId) {
            try {
                const message = `🛒 *Новый заказ №${orderId}*\n\n👤 ${name}\n📞 ${phone}\n📍 ${address}\n💰 Сумма: ${total} ₽`;
                await axios.post(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
                    chat_id: tgChatId, text: message, parse_mode: 'Markdown'
                });
                console.log('📨 Уведомление в Telegram отправлено.');
            } catch (tgErr) {
                console.error('❌ Ошибка Telegram:', tgErr.message);
            }
        }

        res.status(200).json({ success: true, orderId: orderId });
    } catch (err) {
        console.error('Ошибка сохранения заказа:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM orders ORDER BY id DESC');
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/order/status', async (req, res) => {
    try {
        const { id, status } = req.body;
        const allowedStatuses = ['active', 'shipped', 'delivering', 'arrived', 'done', 'canceled'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: 'Неверный статус' });
        }
        await db.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});
// === API: СОЗДАТЬ ПЛАТЕЖ ЮKASSA ===
app.post('/api/pay', async (req, res) => {
    try {
        const { amount, orderId } = req.body;
        const { YooKassa } = require('yookassa-api-sdk');
        
        const sdk = YooKassa({
            shop_id: process.env.YOOKASSA_SHOP_ID,
            secret_key: process.env.YOOKASSA_SECRET_KEY,
        });

        const payment = await sdk.payments.create({
            amount: { value: String(amount), currency: 'RUB' },
            confirmation: { 
                type: 'redirect', 
                return_url: 'http://24dropflow.ru/payment.html' // Куда вернётся клиент после оплаты
            },
            capture: true, // Списание сразу (в одну стадию)
            description: `Заказ №${orderId}`,
            metadata: { order_id: orderId }
        });

        // Отправляем ссылку на оплату клиенту
        res.json({ success: true, confirmation_url: payment.confirmation.confirmation_url });
    } catch (err) {
        console.error('Ошибка ЮKassa:', err);
        res.status(500).json({ success: false, error: 'Ошибка создания платежа' });
    }
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});