require('dotenv').config();
const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors    = require('cors');
const cron    = require('node-cron');
const path    = require('path');
const fs      = require('fs');

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const { initDB }   = require('./models/db');
const { setSocketIO } = require('./services/notificationService');
const { checkAndEscalate, rebalanceUnassigned } = require('./services/workflowService');
const { rateLimit } = require('./middleware/rateLimiter');

const authRoutes      = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes     = require('./routes/admin');
const { notifRouter, deptRouter } = require('./routes/misc');

const app    = express();
const server = http.createServer(app);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Allow any origin in development to support mobile/LAN testing
const corsOrigin = process.env.NODE_ENV === 'production' ? CLIENT_ORIGIN : true;

const io = new Server(server, { cors: { origin: corsOrigin, credentials: true } });

const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(rateLimit());


// ── Socket.io ─────────────────────────────────────────────────────────────────
setSocketIO(io);
io.on('connection', socket => {
  socket.on('join', userId => {
    if (typeof userId === 'string' && userId.length < 64) socket.join(`user:${userId}`);
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/complaints',    complaintRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/notifications', notifRouter);
app.use('/api/departments',   deptRouter);
app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Cron jobs ─────────────────────────────────────────────────────────────────
// Every 30 min: escalate SLA-breached complaints
cron.schedule('*/30 * * * *', () => {
  console.log('[CRON] SLA escalation check…');
  checkAndEscalate();
});

// Every 15 min: retry assigning complaints with no officer
cron.schedule('*/15 * * * *', () => {
  console.log('[CRON] Rebalancing unassigned complaints…');
  rebalanceUnassigned();
});

// ── Boot ──────────────────────────────────────────────────────────────────────
async function start() {
  await initDB();          // create tables, seed departments
  server.listen(PORT, () => {
    console.log(`\n🇮🇳  PS-CRM API running on http://localhost:${PORT}`);
    console.log(`   PostgreSQL connected ✓`);
    console.log(`   Auto-assignment engine active ✓`);
    console.log(`   SLA cron: every 30 min | Rebalance cron: every 15 min\n`);
  });
}

start().catch(err => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
