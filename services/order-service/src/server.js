const express = require('express');
const { MongoClient } = require('mongodb');
const redis = require('redis');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'order-service', port: 3003 })
);

// ── MongoDB ──
const mongoClient = new MongoClient(process.env.MONGO_URL || 'mongodb://mongo:27017');
let ordersDb;
mongoClient.connect()
  .then(() => {
    ordersDb = mongoClient.db('cloudeats_db');
    console.log('[order-service] MongoDB connected');
  })
  .catch(err => console.error('[order-service] MongoDB connection error:', err.message));

// ── Redis (with error handling) ──
const redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://redis:6379' });

// Listen to Redis errors (prevents uncaught exceptions)
redisClient.on('error', (err) => {
  console.error('[order-service] Redis error:', err.message);
});

// Connect – catch rejection so the server stays up
redisClient.connect()
  .then(() => console.log('[order-service] Redis connected'))
  .catch(err => console.error('[order-service] Redis initial connection failed:', err.message));

// ── Routes ──
app.get('/api/cart/:userId', async (req, res) => {
  try {
    const cart = await redisClient.get(`cart:${req.params.userId}`);
    res.json(cart ? JSON.parse(cart) : { items: [], total: 0 });
  } catch (e) {
    // If Redis is down, return empty cart gracefully
    res.json({ items: [], total: 0 });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const order = { ...req.body, placedAt: new Date(), status: 'pending' };
    const result = await ordersDb.collection('orders').insertOne(order);
    res.status(201).json({ message: 'Order placed', orderId: result.insertedId });
  } catch (e) {
    console.error('[order-service] Order creation error:', e.message);
    res.status(500).json({ error: 'DB error' });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`[order-service] Running on port ${PORT}`));
