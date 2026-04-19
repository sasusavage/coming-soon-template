require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS signups (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                email VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('Database table ready');
    } catch (err) {
        console.error('Database init error:', err.message);
    }
}

app.post('/api/signup', async (req, res) => {
    const { name, phone, email } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }
    if (!phone || !phone.trim()) {
        return res.status(400).json({ error: 'Phone number is required' });
    }

    try {
        await pool.query(
            'INSERT INTO signups (name, phone, email) VALUES ($1, $2, $3)',
            [name.trim(), phone.trim(), email ? email.trim() : null]
        );
        res.json({ success: true, message: 'You are on the list!' });
    } catch (err) {
        console.error('Signup error:', err.message);
        res.status(500).json({ error: 'Something went wrong. Try again.' });
    }
});

app.post('/api/admin/login', async (req, res) => {
    const { password } = req.body;

    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Wrong password' });
    }

    try {
        const countResult = await pool.query('SELECT COUNT(*) FROM signups');
        const signupsResult = await pool.query('SELECT id, name, phone, email, created_at FROM signups ORDER BY created_at DESC');

        res.json({
            success: true,
            total: parseInt(countResult.rows[0].count),
            signups: signupsResult.rows
        });
    } catch (err) {
        console.error('Admin fetch error:', err.message);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/admin/signups', async (req, res) => {
    const password = req.headers['x-admin-password'];

    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const countResult = await pool.query('SELECT COUNT(*) FROM signups');
        const signupsResult = await pool.query('SELECT id, name, phone, email, created_at FROM signups ORDER BY created_at DESC');

        res.json({
            total: parseInt(countResult.rows[0].count),
            signups: signupsResult.rows
        });
    } catch (err) {
        console.error('Admin fetch error:', err.message);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/come-to-me', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'come-to-me.html'));
});

app.get('{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
