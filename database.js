// database.js — DropFlow
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'dropflow',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

async function initDB() {
    try {
        // ЗАКАЗЫ
        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(50) NOT NULL,
                email VARCHAR(255),
                address TEXT NOT NULL,
                comment TEXT,
                items JSONB NOT NULL,
                total INTEGER NOT NULL,
                status VARCHAR(50) DEFAULT 'active',
                payment_status VARCHAR(50) DEFAULT 'pending',
                user_login VARCHAR(100),
                yookassa_payment_id VARCHAR(255),
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending'`);
        await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_login VARCHAR(100)`);
        await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS yookassa_payment_id VARCHAR(255)`);
        
        // Индексы для заказов
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_user_login ON orders(user_login)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders("createdAt")`);

        // ТОВАРЫ
        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                price INTEGER NOT NULL,
                old_price INTEGER,
                rating REAL DEFAULT 5,
                popular BOOLEAN DEFAULT false,
                hidden BOOLEAN DEFAULT false,
                image TEXT,
                description TEXT,
                reviews JSONB DEFAULT '[]'
            );
        `);
        // Индексы для товаров
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_products_hidden ON products(hidden)`);

        // КАТЕГОРИИ
        await pool.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL
            );
        `);

        // ПОЛЬЗОВАТЕЛИ
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                login VARCHAR(100) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE,
                phone VARCHAR(50),
                role VARCHAR(20) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Индекс для пользователей
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_login ON users(login)`);

        const adminCheck = await pool.query(`SELECT id FROM users WHERE login = 'admin'`);
        if (adminCheck.rows.length === 0) {
            const bcrypt = require('bcrypt');
            const hash = await bcrypt.hash('admin123', 10);
            await pool.query(
                `INSERT INTO users (login, password_hash, name, email, phone, role) VALUES ('admin',$1,'Администратор','admin@dropflow.ru','+7 (999) 000-00-00','admin')`,
                [hash]
            );
            console.log('👤 Создан админ: login "admin", пароль "admin123" — смените его после первого входа!');
        }

        // ПРОМОКОДЫ
        await pool.query(`
            CREATE TABLE IF NOT EXISTS promos (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                type VARCHAR(20) NOT NULL DEFAULT 'percent',
                value INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        const promoCount = await pool.query(`SELECT COUNT(*) FROM promos`);
        if (Number(promoCount.rows[0].count) === 0) {
            await pool.query(`INSERT INTO promos (code, type, value) VALUES ('WELCOME10','percent',10), ('FLOW500','fixed',500) ON CONFLICT DO NOTHING`);
        }

        // СТРАНИЦЫ
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pages (
                key VARCHAR(50) PRIMARY KEY,
                content TEXT NOT NULL
            );
        `);

        // НАСТРОЙКИ
        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                key VARCHAR(100) PRIMARY KEY,
                value TEXT
            );
        `);

        // ТОЧКИ ВЫДАЧИ СДЭК
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pickup_points (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL DEFAULT 'Пункт выдачи СДЭК',
                address TEXT NOT NULL,
                city VARCHAR(150),
                lat REAL,
                lng REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_pickup_city ON pickup_points(city)`);

        // КОММЕНТАРИИ
        await pool.query(`
            CREATE TABLE IF NOT EXISTS comments (
                id SERIAL PRIMARY KEY,
                product_id INTEGER,
                user_login VARCHAR(100),
                user_name VARCHAR(255),
                text TEXT NOT NULL,
                approved BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_comments_product ON comments(product_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_comments_approved ON comments(approved)`);

        console.log('✅ Таблицы в PostgreSQL успешно проверены/созданы (с индексами).');
    } catch (err) {
        console.error('❌ Ошибка инициализации базы данных:', err);
    }
}

initDB();

module.exports = pool;