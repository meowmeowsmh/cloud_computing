const express = require('express');
const cors    = require('cors');
const db      = require('./db');
const authRoutes = require('./auth');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ════════════════════════════════════════════════════
// 🟢 USER SERVICE ZONE  →  services/user-service/
//    Deps: express · mysql2 · bcrypt · jsonwebtoken
//    DB:   MySQL  (users table)
// ════════════════════════════════════════════════════
app.use('/api/auth', authRoutes);
app.use(express.static('public'));

// ── HEALTH CHECK ───────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'cloudeats-backend' });
});

// ════════════════════════════════════════════════════
// 🔵 MENU SERVICE ZONE  →  services/menu-service/
//    Deps: express · mysql2
//    DB:   MySQL  (menu_items table)
// ════════════════════════════════════════════════════
app.get('/api/menu', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM menu_items ORDER BY category, name');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Menu fetch error:', err.message);
    res.status(500).json({ success: false, error: 'Could not load menu' });
  }
});

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

// ════════════════════════════════════════════════════
// 🟣 ORDER SERVICE ZONE  →  services/order-service/
//    Deps: express · mongodb · redis · jsonwebtoken
//    DB:   MongoDB (orders) + Redis (cart)
// ════════════════════════════════════════════════════
// (Order routes are currently separate – will be extracted in Part 5)

app.listen(PORT, () => console.log(`CloudEats backend running on port ${PORT}`));