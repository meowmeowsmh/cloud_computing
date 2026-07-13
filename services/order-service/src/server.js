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
mongoClient.connect().then(() => {
  ordersDb = mongoClient.db('cloudeats_db');
  console.log('[order-service] MongoDB connected');
}).catch(err => console.error('[order-service] MongoDB error:', err));

// ── Redis ──
const redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://redis:6379' });
redisClient.connect().then(() => console.log('[order-service] Redis connected'));

// ── Placeholder routes (you'll implement full ones later) ──
app.get('/api/cart/:userId', async (req, res) => {
  try {
    const cart = await redisClient.get(`cart:${req.params.userId}`);
    res.json(cart ? JSON.parse(cart) : { items: [], total: 0 });
  } catch (e) { res.status(500).json({ error: 'Redis error' }); }
});

app.post('/api/orders', async (req, res) => {
  try {
    const order = { ...req.body, placedAt: new Date(), status: 'pending' };
    const result = await ordersDb.collection('orders').insertOne(order);
    res.status(201).json({ message: 'Order placed', orderId: result.insertedId });
  } catch (e) { res.status(500).json({ error: 'DB error' }); }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`[order-service] Running on port ${PORT}`));
