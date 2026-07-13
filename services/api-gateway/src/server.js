const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(cors());
app.use(express.json());

// ── Log all incoming requests ──
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

const SERVICES = {
  user:  process.env.USER_SERVICE_URL  || 'http://user-service:3001',
  menu:  process.env.MENU_SERVICE_URL  || 'http://menu-service:3002',
  order: process.env.ORDER_SERVICE_URL || 'http://order-service:3003',
};

app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'api-gateway', port: 8000 })
);

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.headers['x-user-id'] = decoded.id;
    req.headers['x-user-email'] = decoded.email;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── PROXY WITH ROUTER TO PRESERVE FULL PATH ──
function proxy(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path, req) => {
      // Forward the full original URL (including /api/menu, /api/auth, etc.)
      return req.originalUrl;
    },
    on: {
      error: (err, req, res) => {
        console.error('Proxy error:', err.message);
        res.status(503).json({ error: 'Upstream service unavailable', target });
      },
      proxyReq: (proxyReq, req, res) => {
        console.log(`➡️ Proxying ${req.method} ${req.originalUrl} to ${target}`);
      }
    }
  });
}
// Public routes (no auth)
app.use('/api/auth', proxy(SERVICES.user));   // register, login
app.use('/api/menu', proxy(SERVICES.menu));   // public menu

// Protected routes
app.use('/api/users', requireAuth, proxy(SERVICES.user));
app.use('/api/cart', requireAuth, proxy(SERVICES.order));
app.use('/api/orders', requireAuth, proxy(SERVICES.order));

// 404
app.use((req, res) =>
  res.status(404).json({
    error: 'Route not found in gateway',
    path: req.path,
    available: ['/api/auth', '/api/menu', '/api/users', '/api/cart', '/api/orders']
  })
);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`[api-gateway] Listening on :${PORT}`);
  console.log(`  /api/auth  → ${SERVICES.user}`);
  console.log(`  /api/menu  → ${SERVICES.menu}`);
  console.log(`  /api/orders→ ${SERVICES.order}`);
});
