const express = require('express');
const mysql   = require('mysql2/promise');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const cors    = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ── Health check ──
app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'user-service', port: 3001 })
);

// ── MySQL connection ──
const db = mysql.createPool({
  host:     process.env.MYSQL_HOST     || 'mysql',
  user:     process.env.MYSQL_USER     || 'cloudeats_user',
  password: process.env.MYSQL_PASSWORD || 'cloudeats_pass',
  database: process.env.MYSQL_DATABASE || 'cloudeats_db',
});

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const SALT_ROUNDS = 10;

// ══════════════════════════════════════════════
//  LAB 8.1 – JWT AUTHENTICATION
// ══════════════════════════════════════════════

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided. Please log in.' });
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
    }
    req.user = decoded; // { id, email, role, ... }
    next();
  });
}

// ══════════════════════════════════════════════
//  LAB 8.2 – ROLE-BASED ACCESS CONTROL
// ══════════════════════════════════════════════

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. This route requires role: ${roles.join(' or ')}`
      });
    }
    next();
  };
}

// ── REGISTER (public) ──
app.post('/api/auth/register', async (req, res) => {
  const { email, password, full_name, phone } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, password, and full name are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await db.query(
      'INSERT INTO users (email, password_hash, full_name, phone, role) VALUES (?, ?, ?, ?, DEFAULT)',
      [email, password_hash, full_name, phone || null]
    );
    res.status(201).json({ message: 'Account created successfully', userId: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Registration error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── LOGIN (public) ──
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id, email, password_hash, full_name, role FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // JWT payload includes role
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      userId: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      token: token
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── GET /api/users/:id (protected, own profile only) ──
app.get('/api/users/:id', authenticateToken, async (req, res) => {
  const userId = parseInt(req.params.id);
  if (req.user.id !== userId) {
    return res.status(403).json({ error: 'Access denied. You can only view your own profile.' });
  }
  try {
    const [rows] = await db.query(
      'SELECT id, email, full_name, phone, role, created_at FROM users WHERE id = ?',
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN ROUTE (protected by authenticateToken + requireRole) ──
app.get('/api/admin/users',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const [rows] = await db.query('SELECT id, email, full_name, role, created_at FROM users ORDER BY id');
      res.json({ users: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`[user-service] Running on http://localhost:${PORT}`)
);