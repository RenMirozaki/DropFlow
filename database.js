const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'dropflow',
});

// Функция для автоматического создания таблиц при старте
async function initDB() {
    try {
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
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Таблицы в PostgreSQL успешно проверены/созданы.');
    } catch (err) {
        console.error('❌ Ошибка инициализации базы данных:', err);
    }
}

initDB();

module.exports = pool;