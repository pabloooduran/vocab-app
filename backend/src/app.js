require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./db/database');

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const statsRoutes = require('./routes/stats');

const app = express();

// Allow requests from the frontend (Vercel) and localhost in dev
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (e.g. mobile apps, curl)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return cb(null, true);
    }
    cb(new Error('CORS not allowed'));
  },
  credentials: true
}));

app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/stats', statsRoutes);

async function startServer(port) {
  await initializeDatabase();
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`GRE Vocab server running on port ${port}`);
      resolve(port);
    });
    server.on('error', reject);
  });
}

if (require.main === module) {
  const PORT = parseInt(process.env.PORT) || 3001;
  startServer(PORT).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = { app, startServer };
