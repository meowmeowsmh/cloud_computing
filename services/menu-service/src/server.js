const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ── Health check ──
app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'menu-service', port: 3002 })
);

// ── MySQL connection ──
const db = mysql.createPool({
  host:     process.env.MYSQL_HOST     || 'db',
  user:     process.env.MYSQL_USER     || 'cloudeats_user',
  password: process.env.MYSQL_PASSWORD || 'cloudeats_password',
  database: process.env.MYSQL_DATABASE || 'cloudeats_db',
});

// ── GET all menu items ──
app.get('/api/menu', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM menu_items ORDER BY category, name');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Menu fetch error:', err.message);
    res.status(500).json({ success: false, error: 'Could not load menu' });
  }
});

// ── GET menu by category ──
app.get('/api/menu/category/:category', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM menu_items WHERE category = ? ORDER BY name',
      [req.params.category]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET single menu item ──
app.get('/api/menu/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () =>
  console.log(`[menu-service] Running on http://localhost:${PORT}`)
);
