import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '15mb' }));

// MongoDB Atlas connection string from environment or default Atlas URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vinsshambhavi_db_user:tPwkTJMeYnxBCRnW@vinsnetbill.rpipe8n.mongodb.net/cash_db?retryWrites=true&w=majority';
const DB_NAME = process.env.MONGODB_DBNAME || 'cash_db';

let cachedClient: MongoClient | null = null;

async function getDb() {
  try {
    if (!cachedClient) {
      cachedClient = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });
      await cachedClient.connect();
    }
    return cachedClient.db(DB_NAME);
  } catch (err) {
    cachedClient = null;
    throw err;
  }
}

// 1. Health & Connection Status
app.get('/api/mongodb/health', async (_req, res) => {
  try {
    const db = await getDb();
    const [subscribersCount, paymentsCount, operatorsCount] = await Promise.all([
      db.collection('subscribers').countDocuments(),
      db.collection('payments').countDocuments(),
      db.collection('operators').countDocuments(),
    ]);

    res.json({
      success: true,
      database: DB_NAME,
      connected: true,
      counts: {
        subscribers: subscribersCount,
        payments: paymentsCount,
        operators: operatorsCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      database: DB_NAME,
      connected: false,
      error: err?.message || 'Failed to connect to MongoDB Atlas'
    });
  }
});

// 2. Push & Sync Data to MongoDB Collections
app.post('/api/mongodb/push', async (req, res) => {
  try {
    const { customers, payments, operators, settings } = req.body;
    const db = await getDb();

    // 1. Upsert Subscribers
    if (Array.isArray(customers) && customers.length > 0) {
      const subBulk = customers.map(c => ({
        updateOne: {
          filter: { id: c.id },
          update: { $set: { ...c, updatedAt: new Date().toISOString() } },
          upsert: true
        }
      }));
      await db.collection('subscribers').bulkWrite(subBulk);
    }

    // 2. Upsert Payments
    if (Array.isArray(payments) && payments.length > 0) {
      const payBulk = payments.map(p => ({
        updateOne: {
          filter: { id: p.id },
          update: { $set: { ...p, updatedAt: new Date().toISOString() } },
          upsert: true
        }
      }));
      await db.collection('payments').bulkWrite(payBulk);
    }

    // 3. Upsert Operators
    if (Array.isArray(operators) && operators.length > 0) {
      const opBulk = operators.map(o => ({
        updateOne: {
          filter: { id: o.id },
          update: { $set: { ...o, updatedAt: new Date().toISOString() } },
          upsert: true
        }
      }));
      await db.collection('operators').bulkWrite(opBulk);
    }

    // 4. Save Settings
    if (settings && typeof settings === 'object') {
      await db.collection('settings').updateOne(
        { key: 'terminal_settings' },
        { $set: { key: 'terminal_settings', ...settings, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
    }

    res.json({
      success: true,
      message: `Synchronized ${customers?.length || 0} subscribers and ${payments?.length || 0} payments to MongoDB Atlas (${DB_NAME})`,
      database: DB_NAME,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('MongoDB push error:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to push records to MongoDB'
    });
  }
});

// 3. Pull Data from MongoDB Collections
app.get('/api/mongodb/pull', async (_req, res) => {
  try {
    const db = await getDb();
    const [rawCustomers, rawPayments, rawOperators, rawSettings] = await Promise.all([
      db.collection('subscribers').find({}).toArray(),
      db.collection('payments').find({}).toArray(),
      db.collection('operators').find({}).toArray(),
      db.collection('settings').findOne({ key: 'terminal_settings' })
    ]);

    // Strip MongoDB internal _id before returning to frontend
    const sanitize = (items: any[]) => items.map(({ _id, ...rest }) => rest);

    res.json({
      success: true,
      customers: sanitize(rawCustomers),
      payments: sanitize(rawPayments),
      operators: sanitize(rawOperators),
      settings: rawSettings ? (({ _id, key, ...rest }: any) => rest)(rawSettings) : null,
      database: DB_NAME,
      message: `Retrieved ${rawCustomers.length} subscribers and ${rawPayments.length} receipts from MongoDB Atlas`
    });
  } catch (err: any) {
    console.error('MongoDB pull error:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to pull records from MongoDB'
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VinsNetBill Terminal running at http://localhost:${PORT}`);
    console.log(`Connected to MongoDB Atlas: ${DB_NAME}`);
  });
}

startServer();
