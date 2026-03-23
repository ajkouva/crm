# PS-CRM — Public Service Complaint Management System

A full-stack web application for managing citizen complaints with AI-powered classification,
smart auto-assignment, SLA tracking, and real-time notifications.

## Stack

| Layer    | Technology                                      |
|----------|-------------------------------------------------|
| Frontend | React 18 + Vite, Recharts, Socket.io-client     |
| Backend  | Node.js + Express, Socket.io, node-cron         |
| Database | PostgreSQL (via `pg` Pool)                      |
| AI       | Anthropic Claude API (with keyword fallback)    |
| Auth     | JWT (7-day tokens) + bcrypt (12 rounds)         |

## Project Structure

```
ps-crm/
├── client/                 # React frontend (Vite)
│   └── src/
│       ├── pages/          # Dashboard, ComplaintsList, ComplaintDetail, …
│       ├── components/     # Sidebar
│       ├── context/        # AuthContext
│       └── utils/api.js    # Fetch wrapper + snake_case→camelCase converter
└── server/                 # Express backend
    ├── models/db.js        # pg Pool + schema bootstrap (initDB)
    ├── routes/             # auth, complaints, analytics, misc
    ├── services/
    │   ├── workflowService.js    # Auto-assignment engine + SLA cron
    │   ├── notificationService.js
    │   └── aiService.js          # Claude API + keyword fallback
    ├── middleware/         # auth (JWT), audit log
    └── seed.js             # Demo data
```

## Quick Start

### 1. PostgreSQL

Create a database:
```bash
createdb pscrm
```

### 2. Server

```bash
cd server
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, optionally ANTHROPIC_API_KEY
npm install
node seed.js        # Creates tables + inserts demo data (run once)
npm run dev         # nodemon — hot reload
```

The server runs `initDB()` on every start, so schema changes are applied automatically in development.

### 3. Client

```bash
cd client
npm install
npm run dev         # http://localhost:5173
```

The Vite dev server proxies `/api` and `/socket.io` to `http://localhost:3001`.

## Demo Accounts (all passwords: `password123`)

| Email                  | Role            |
|------------------------|-----------------|
| admin@pscrm.in         | Super Admin     |
| collector@pscrm.in     | Collector       |
| head.water@pscrm.in    | Dept Head       |
| ravi@water.in          | Field Officer   |
| rahul@example.com      | Citizen         |

## Auto-Assignment Engine

When a complaint is submitted:

1. **AI classification** identifies the correct department (falls back to keyword matching if no API key or if the call times out in 6s).
2. **`autoAssignOfficer()`** queries all active field officers in that department and scores them:
   - Score = `active_count × 10 − hours_since_last_assigned`
   - Lowest score wins (fewest open cases, least recently assigned)
   - Uses `FOR UPDATE SKIP LOCKED` so concurrent submissions never double-assign
3. The `officer_load` table is updated atomically in the same transaction.
4. If no officer is available, dept_heads are notified and the complaint stays `new`.
5. A **cron every 15 minutes** (`rebalanceUnassigned`) retries unassigned complaints in priority order (P1 first).
6. When a complaint is **resolved/closed**, `decrementOfficerLoad()` keeps the count accurate.

## Cron Jobs

| Schedule     | Job                         | Description                              |
|--------------|-----------------------------|------------------------------------------|
| Every 15 min | `rebalanceUnassigned()`     | Retry assignment for officer-less cases  |
| Every 30 min | `checkAndEscalate()`        | Auto-escalate SLA-breached complaints    |

## SLA Tiers

| Priority | Deadline | Auto-escalation on breach |
|----------|----------|--------------------------|
| P1       | 24 hours | ✓                        |
| P2       | 72 hours | ✓                        |
| P3       | 7 days   | ✓                        |

## Environment Variables

```
DATABASE_URL=postgresql://user:pass@localhost:5432/pscrm
PORT=3001
JWT_SECRET=long-random-string
CLIENT_ORIGIN=http://localhost:5173
ANTHROPIC_API_KEY=optional
```

## Production Notes

- Set `NODE_ENV=production` — SSL is enabled on the pg Pool automatically when `DATABASE_URL` is not localhost.
- Change `JWT_SECRET` to a cryptographically random 64-character string.
- Set `CLIENT_ORIGIN` to your actual frontend domain for CORS.
- The rate limiter is in-memory — for multi-instance deployments, replace with Redis-backed rate limiting.
