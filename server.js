const express = require('express');
const path = require('path');
const db = require('./database');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const axios = require('axios'); // Используем axios для Telegram
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Безопасность заголовков (Helmet)
app.use(helmet({
    contentSecurityPolicy: false,
}));

// 2. Ограничение количества запросов (Rate Limiting)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Слишком много запросов с вашего IP, попробуйте позже.'
});
app.use('/api/', generalLimiter);

// Строгий лимит для оформления заказа
const orderLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: 'Слишком много попыток оформления заказа. Подождите немного.'
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// === API: Создать заказ (с валидацией) ===
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
        // Данные уже очищены и проверены валидатором, SQL-инъекции исключены
        const { name, phone, email, address, comment, items, total } = req.body;

        // Сохраняем в базу (параметризованный запрос)
        const result = await db.query(
            `INSERT INTO orders (name, phone, email, address, comment, items, total, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [name, phone, email, address, comment, JSON.stringify(items), total, 'active']
        );

        const orderId = result.rows[0].id;
        console.log(`🛒 Новый заказ №${orderId} от ${name} на сумму ${total} ₽`);

        // === УВЕДОМЛЕНИЕ В TELEGRAM ДЛЯ АДМИНА ===
        const tgToken = process.env.TELEGRAM_BOT_TOKEN;
        const tgChatId = process.env.TELEGRAM_CHAT_ID;

        if (tgToken && tgChatId) {
            try {
                const message = `🛒 *Новый заказ №${orderId}*\n\n` +
                                `👤 ${name}\n` +
                                `📞 ${phone}\n` +
                                `📍 ${address}\n` +
                                `💰 Сумма: ${total} ₽`;

                const tgUrl = `https://api.telegram.org/bot${tgToken}/sendMessage`;
                
                await axios.post(tgUrl, {
                    chat_id: tgChatId,
                    text: message,
                    parse_mode: 'Markdown'
                });
                
                console.log('📨 Уведомление в Telegram отправлено.');
            } catch (tgErr) {
                if (tgErr.response) {
                    console.error('❌ Ошибка Telegram API:', tgErr.response.data.description);
                } else {
                    console.error('❌ Ошибка сети при отправке в Telegram:', tgErr.message);
                }
            }
        } else {
            console.log('⚠️ Уведомление в Telegram не отправлено: не указан токен или chat_id в .env');
        }

        res.status(200).json({ success: true, orderId: orderId });
    } catch (err) {
        console.error('Ошибка сохранения заказа:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// === API: Получить все заказы ===
app.get('/api/orders', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM orders ORDER BY id DESC');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Ошибка получения заказов:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// === API: Обновить статус заказа ===
app.post('/api/order/status', async (req, res) => {
    try {
        const { id, status } = req.body;
        const allowedStatuses = ['active', 'shipped', 'delivering', 'arrived', 'done', 'canceled'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: 'Неверный статус' });
        }

        await db.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
        console.log(`🔄 Статус заказа №${id} изменен на: ${status}`);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Ошибка обновления статуса:', err);
        res.status(500).json({ success: false });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});