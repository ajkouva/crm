# PS-CRM — Complete Technical Documentation

> Version 2.0 · March 2026 · Government of India Digital Initiative

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Database Schema](#3-database-schema)
4. [Backend — API Reference](#4-backend--api-reference)
5. [AI Engine](#5-ai-engine)
6. [Workflow Engine](#6-workflow-engine)
7. [SLA System](#7-sla-system)
8. [Authentication & Security](#8-authentication--security)
9. [Real-time System (Socket.io)](#9-real-time-system-socketio)
10. [Email / Notification System](#10-email--notification-system)
11. [Frontend Architecture](#11-frontend-architecture)
12. [GSAP Animations](#12-gsap-animations)
13. [Environment Variables](#13-environment-variables)
14. [Deployment Guide](#14-deployment-guide)
15. [Cron Jobs](#15-cron-jobs)
16. [Demo Accounts & Test Data](#16-demo-accounts--test-data)

---

## 1. System Overview

PS-CRM (**Public Service Complaint Resolution Management**) is a full-stack government grievance redressal platform built to digitize and automate the entire lifecycle of a citizen complaint — from submission to resolution.

### High-Level Flow

```
Citizen → Submits Complaint → AI Classifies Department + Priority
         → Auto-Assignment Engine → Field Officer Assigned
         → Officer Updates Status → Citizen Notified in Real-time
         → SLA enforced by Cron → Escalated if Breached
         → Resolved → Citizen Rates
```

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React 18 + Vite)                │
│  PublicHome  AuthPage  Dashboard  ComplaintDetail  Analytics    │
│  Zustand  GSAP  Socket.io-client  Leaflet  Recharts  i18next    │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP / WebSocket
┌───────────────────────────────▼─────────────────────────────────┐
│                    SERVER (Node.js + Express)                    │
│                                                                 │
│  Routes: /auth  /complaints  /analytics  /misc                  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  AI Service  │  │  Workflow    │  │  Notification        │  │
│  │  (Gemini AI  │  │  Service     │  │  Service             │  │
│  │  + fallback) │  │  (Assign +   │  │  (Socket.io +        │  │
│  └──────────────┘  │  SLA + Cron) │  │  Nodemailer)         │  │
│                    └──────────────┘  └──────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  PostgreSQL (pg Pool)                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema

All tables are created automatically on server start (`initDB()` in `models/db.js`). Schema changes are applied idempotently.

### `departments`
| Column | Type | Description |
|---|---|---|
| id | VARCHAR(10) PK | e.g. `d1`, `d2` … `d8` |
| name | VARCHAR(100) | Department display name |
| category | VARCHAR(100) | AI classification category |

**Seeded Departments:**

| ID | Department | Category |
|---|---|---|
| d1 | Water & Sanitation | Water |
| d2 | Roads & Infrastructure | Roads |
| d3 | Electricity | Electricity |
| d4 | Waste Management | Waste |
| d5 | Public Health | Health |
| d6 | Education | Education |
| d7 | Law & Order | Police |
| d8 | Urban Development | Urban |

### `users`
| Column | Type | Description |
|---|---|---|
| id | SERIAL PK | Auto-increment |
| name | VARCHAR(150) | Full name |
| email | VARCHAR(255) UNIQUE | Login email |
| phone | VARCHAR(20) | Optional phone |
| password_hash | TEXT | bcrypt 12-round hash |
| role | VARCHAR(50) | `citizen`, `field_officer`, `dept_head`, `collector`, `super_admin` |
| department_id | VARCHAR(10) FK | Null for citizen/admin |
| service_area | TEXT | Officer's area (for geospatial matching) |
| active | BOOLEAN | `FALSE` until admin approves |
| email_verified | BOOLEAN | `FALSE` until OTP confirmed |
| reset_token | VARCHAR(10) | 6-digit OTP for password reset |
| reset_token_expires | TIMESTAMPTZ | OTP expiry (15 min) |
| created_at | TIMESTAMPTZ | Auto |

### `officer_load`
| Column | Type | Description |
|---|---|---|
| officer_id | INTEGER FK (users) | Field officer |
| active_count | INTEGER | Current active complaints assigned |
| last_assigned | TIMESTAMPTZ | Time of last assignment |

This table is the heart of the fair-load assignment algorithm — queried on every auto-assignment.

### `complaints`
| Column | Type | Description |
|---|---|---|
| id | UUID PK | uuidv4 |
| ticket_id | VARCHAR(30) UNIQUE | e.g. `CRM-2026-ABCD` |
| category | VARCHAR(100) | AI-inferred category |
| title / description | TEXT | Complaint content |
| location_text | TEXT | Manual address |
| latitude / longitude | DECIMAL(10,7) | GPS coordinates |
| priority | VARCHAR(5) | `P1` / `P2` / `P3` |
| status | VARCHAR(30) | Full workflow status |
| department_id | FK | Auto-assigned department |
| assigned_officer_id | FK (users) | Null until assigned |
| citizen_id | FK (users) | Who filed it |
| media_urls | TEXT[] | Uploaded file paths |
| is_anonymous | BOOLEAN | Hides citizen identity |
| language | VARCHAR(5) | `en`, `hi`, etc. |
| ai_summary | TEXT | AI-generated summary |
| ai_confidence | DECIMAL(3,2) | 0.0–1.0 |
| duplicate_group_id | UUID | ID linking duplicate complaints |
| sla_deadline | TIMESTAMPTZ | Computed from priority |
| resolution_notes | TEXT | Officer's resolution message |
| rating | SMALLINT | Citizen rating 1–5 |
| rating_comment | TEXT | Citizen feedback |
| appeal_reason | TEXT | Citizen appeal text |
| created_at / updated_at | TIMESTAMPTZ | Auto-managed |

### `complaint_status_history`
| Column | Type | Description |
|---|---|---|
| id | SERIAL PK | Auto-increment |
| complaint_id | UUID FK | Parent complaint |
| status | VARCHAR(30) | Status at this point |
| note | TEXT | Change note |
| changed_by_id | FK (users) | Who made the change |
| created_at | TIMESTAMPTZ | When |

### `complaint_comments`
| Column | Type | Description |
|---|---|---|
| id | SERIAL PK | |
| complaint_id | UUID FK | |
| user_id | FK (users) | |
| content | TEXT | Comment body |
| created_at | TIMESTAMPTZ | |

### `notifications`
| Column | Type | Description |
|---|---|---|
| id | SERIAL PK | |
| user_id | FK (users) | Target user |
| title / message | TEXT | Content |
| type | VARCHAR(50) | `complaint`, `assignment`, `status`, etc. |
| complaint_id | UUID FK nullable | |
| read | BOOLEAN | Default false |
| created_at | TIMESTAMPTZ | |

### `audit_log`
| Column | Type | Description |
|---|---|---|
| id | SERIAL PK | |
| user_id | FK (users) | Actor |
| action | VARCHAR(100) | e.g. `complaint:status_change` |
| entity_type | VARCHAR(50) | `complaint`, `user`, etc. |
| entity_id | TEXT | The affected record's ID |
| metadata | JSONB | Extra context |
| created_at | TIMESTAMPTZ | |

---

## 4. Backend — API Reference

Base URL: `http://localhost:3001/api`

All protected routes require: `Authorization: Bearer <JWT_TOKEN>`

### Auth Routes — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | None | Register user, send OTP email |
| POST | `/verify-email` | None | Verify 6-digit OTP |
| POST | `/resend-verification` | None | Resend OTP |
| POST | `/login` | None | Login, returns JWT |
| POST | `/forgot-password` | None | Send password-reset OTP |
| POST | `/reset-password` | None | Verify OTP + set new password |
| GET | `/me` | ✅ JWT | Get current user profile |

### Complaint Routes — `/api/complaints`

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/` | ✅ | citizen | Submit new complaint (multipart/form-data) |
| GET | `/` | ✅ | all | List complaints (role-filtered, paginated) |
| GET | `/:id` | ✅ | all | Get full complaint details |
| PATCH | `/:id/status` | ✅ | officer+ | Update status + note |
| PATCH | `/:id/assign` | ✅ | dept_head+ | Manual officer assignment |
| POST | `/:id/comments` | ✅ | all | Add comment to complaint |
| GET | `/:id/comments` | ✅ | all | Get comments |
| PATCH | `/:id/rate` | ✅ | citizen | Rate resolved complaint |
| POST | `/:id/appeal` | ✅ | citizen | Appeal a resolved complaint |
| GET | `/track/:ticketId` | None | — | Public ticket tracker |

### Analytics Routes — `/api/analytics`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/public/stats` | None | Total, resolved, avg resolution |
| GET | `/dashboard` | ✅ | Role-filtered stats for dashboard KPIs |
| GET | `/charts` | ✅ | Category + status distribution for charts |
| GET | `/officer-performance` | ✅ dept_head+ | Per-officer workload metrics |
| GET | `/heatmap` | ✅ | Lat/lng for Leaflet heatmap |

### Misc Routes — `/api`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/departments` | None | All department list |
| GET | `/notifications` | ✅ | User's notifications |
| PATCH | `/notifications/:id/read` | ✅ | Mark as read |
| GET | `/uploads/:filename` | None | Serve uploaded files |

---

## 5. AI Engine

**File:** `server/services/aiService.js`

### Classification Flow

```
complaint text + location
        │
        ▼
┌───────────────────────┐
│ 1. Gibberish Check    │ → Reject if score > 0.6
└───────────┬───────────┘
            ▼
┌───────────────────────┐
│ 2. Gemini AI API      │ → Returns: category, priority,
│  (gemini-2.0-flash)   │   urgencyReason, isGibberish,
│  6-second timeout     │   summary, confidence
└───────────┬───────────┘
            │ If fails/timeout…
            ▼
┌───────────────────────┐
│ 3. Keyword Fallback   │ → Regex match on 40+ keywords
└───────────────────────┘
```

### Gemini Prompt
The AI is given a structured JSON prompt including the complaint title, description, and location. It returns:
- `category` — one of 8 department categories
- `priority` — P1/P2/P3 based on urgency
- `urgencyReason` — natural-language justification
- `isGibberish` — boolean
- `summary` — bilingual summary (English + Hindi)
- `confidence` — 0.0–1.0

### DEPT_TO_ID Mapping
```js
const DEPT_TO_ID = {
  'Water':       'd1',
  'Roads':       'd2',
  'Electricity': 'd3',
  'Waste':       'd4',
  'Health':      'd5',
  'Education':   'd6',
  'Police':      'd7',
  'Urban':       'd8',
  'General':     'd1',  // fallback
};
```

### Duplicate Detection
```
New complaint (lat, lng, category)
        │
        ▼
Query all open complaints in same category
within 0.01° (~1km) geospatial radius
        │
        ├─ Match found → link to duplicate_group_id
        │                 check duplicate count
        │                 if count ≥ 3 → P1 + escalate
        └─ No match → create new group
```

---

## 6. Workflow Engine

**File:** `server/services/workflowService.js`

### Auto-Assignment Algorithm

When a complaint is created, `autoAssignOfficer(complaintId, departmentId)` runs in a separate `setImmediate` call (non-blocking).

```sql
-- Select candidates
SELECT u.id, u.name, u.email,
       COALESCE(ol.active_count, 0) AS active_count,
       ol.last_assigned
FROM users u
LEFT JOIN officer_load ol ON ol.officer_id = u.id
WHERE u.role = 'field_officer'
  AND u.department_id = $1
  AND u.active = TRUE
  AND u.email_verified = TRUE
ORDER BY
  (COALESCE(ol.active_count, 0) * 10)
  + EXTRACT(EPOCH FROM (NOW() - COALESCE(ol.last_assigned, '2000-01-01'))) / 3600
ASC
LIMIT 1
FOR UPDATE SKIP LOCKED
```

**Score formula:**
```
score = (active_count × 10) + hours_since_last_assigned
```

- **Lower score = better candidate**
- `FOR UPDATE SKIP LOCKED` prevents race conditions on concurrent submissions
- Transaction wraps complaint update + officer_load upsert atomically

### Assignment Steps
1. Begin DB transaction
2. Find best officer (query above)
3. Update `complaints.assigned_officer_id` + `status = 'assigned'` + `sla_deadline`
4. Upsert `officer_load`: increment `active_count`, set `last_assigned = NOW()`
5. Add status history entry
6. Commit transaction
7. Create in-app notification + Socket.io push to officer
8. If no officer found → notify dept_head

### `decrementOfficerLoad(officerId)`
Called when a complaint is resolved or closed:
```sql
UPDATE officer_load
SET active_count = GREATEST(active_count - 1, 0)
WHERE officer_id = $1
```

---

## 7. SLA System

**File:** `workflowService.js` → `checkAndEscalate()`

### Priority → Deadline
```js
const SLA_HOURS = { P1: 24, P2: 72, P3: 168 };
```

### SLA Status Labels
| Condition | Status |
|---|---|
| resolved/closed | `met` ✅ |
| now > deadline | `breached` 🔴 |
| deadline < 4h | `critical` 🟠 |
| deadline < 12h | `warning` 🟡 |
| else | `ok` 🟢 |

### Escalation Logic (every 30 min)
```sql
SELECT c.id FROM complaints c
WHERE c.status NOT IN ('resolved','closed')
  AND c.sla_deadline IS NOT NULL
  AND c.sla_deadline < NOW()
  AND c.status != 'escalated'
```
For each breached complaint:
- Status → `pending_escalation`
- Status history entry added
- Collector + Super Admin notified

---

## 8. Authentication & Security

### JWT Flow
1. User logs in → server verifies password with `bcryptjs.compare`
2. Signs JWT with 7-day expiry: `jwt.sign({ id, role, active }, JWT_SECRET, { expiresIn: '7d' })`
3. Client stores token in `localStorage`
4. Every API request sends `Authorization: Bearer <token>`
5. `authMiddleware` verifies + decodes token, attaches `req.user`

### Registration OTP Flow
```
POST /api/auth/register
 → Hash password (bcrypt, 12 rounds)
 → INSERT user (active=FALSE, email_verified=FALSE)
 → Generate 6-digit OTP, hash+store with 15-min expiry
 → Send OTP email via Nodemailer
 → Return 201 (+ devOtp in development mode)

POST /api/auth/verify-email
 → Fetch user by email
 → Compare OTP (bcrypt)
 → Set email_verified=TRUE
 → Notify admin to activate user
```

### Role Hierarchy
```
super_admin > collector > dept_head > field_officer > citizen
```

`requireRole(...roles)` middleware enforces access at route level.

### Rate Limiting
- In-memory Map tracking `IP → { count, windowStart }`
- 100 requests per 15-minute window per IP
- Returns 429 on breach

---

## 9. Real-time System (Socket.io)

**Server:** `index.js` — `io = new Server(httpServer, { cors })`

### Events

| Event (server → client) | Payload | Description |
|---|---|---|
| `notification` | `{ title, message, type }` | New notification for user |
| `complaint:update` | `{ complaintId, status }` | Status change broadcast |

### Room Strategy
- On login, client emits `join` with `user.id`
- Server: `socket.join(userId)` — user-specific room
- Notifications sent: `io.to(userId).emit('notification', ...)`

---

## 10. Email / Notification System

**File:** `utils/mailer.js` + `services/notificationService.js`

### SMTP Configuration
```js
nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,   // smtp.gmail.com
  port:   587,
  secure: false,                     // STARTTLS
  auth: { user, pass },             // Gmail App Password
  tls: { rejectUnauthorized: false }
})
```

### Triggered Emails
| Trigger | Recipient | Subject |
|---|---|---|
| Registration | Citizen | OTP Verification Code |
| Forgot Password | User | Password Reset Code |
| Complaint Created | Citizen | Complaint Filed Confirmation |
| Complaint Assigned | Officer | New Assignment |
| Status Change | Citizen | Status Update |

### In-app Notifications
- Stored in `notifications` table
- Socket.io push for real-time badge updates
- Notification center in sidebar with read/unread state

---

## 11. Frontend Architecture

### State Management (Zustand)
**File:** `store/useAuthStore.js`

```js
// Global state shape:
{
  user: null | { id, name, email, role, active, ... },
  token: string | null,
  login(email, password): Promise<void>,
  register(formData): Promise<{ devOtp? }>,
  logout(): void,
}
```

### Router Structure (`App.jsx`)
```
/                   → PublicHome (public)
/auth               → AuthPage (public)
/track              → TrackComplaint (public)
/transparency       → TransparencyDashboard (public)
/about /faq /process→ InfoPages (hybrid — navbar if public, sidebar if logged in)
/pending-approval   → PendingApproval (guard: non-active users only)
/*                  → Layout + Guard (authenticated + active users only)
  /dashboard
  /complaints
  /complaints/:id
  /submit
  /notifications
  /analytics
  /admin
```

### Key Contexts
- `ThemeContext` — Light/Dark mode, persisted to localStorage
- `AuthContext` — Legacy compatibility layer (wraps Zustand store)

### API Utility (`utils/api.js`)
- Single `api` object with typed methods for every endpoint
- Auto snake_case → camelCase conversion on all responses
- Injects `Authorization` header from Zustand store token
- Centralized error handling

---

## 12. GSAP Animations

**Installed:** `gsap` + `@gsap/react`, registered with `ScrollTrigger` plugin.

### PublicHome.jsx
```js
// Hero entrance (on mount)
gsap.timeline()
  .from('.hero-title',    { y: -30, opacity: 0, duration: 0.4 }, 'hero')
  .from('.hero-subtitle', { y:  20, opacity: 0, duration: 0.4 }, 'hero')
  .fromTo('.btn-primary-hero', { x: -40, opacity: 0 }, { x: 0, opacity: 1 }, 'btns')
  .fromTo('.btn-ghost-hero',   { x:  40, opacity: 0 }, { x: 0, opacity: 1 }, 'btns');

// Scroll-triggered feature cards
gsap.from('.feature-card', {
  y: -20, opacity: 0, stagger: 0.1,
  scrollTrigger: { trigger: '.feature-grid', start: 'top 65%' }
});

// Scroll-triggered stats grid
gsap.from('.stats-grid', {
  opacity: 0, scale: 0.95,
  scrollTrigger: { trigger: '.stats-grid', start: 'top 70%' }
});
```

### AuthPage.jsx
```js
// Auth panel entrance (on mount)
gsap.timeline()
  .from('.auth-left',       { x: -100, opacity: 0, duration: 0.6, ease: 'power3.out' }, 'enter')
  .from('.auth-right .card', { scale: 0.9, opacity: 0, duration: 0.5, ease: 'back.out(1.4)' }, 'enter+=0.1');
```

---

## 13. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Full PostgreSQL connection string |
| `PORT` | ✅ | Server port (default 3001) |
| `NODE_ENV` | ✅ | `development` or `production` |
| `JWT_SECRET` | ✅ | Min 64 random characters |
| `CLIENT_ORIGIN` | ✅ | Frontend URL for CORS |
| `GEMINI_API_KEY` | ⚠️ recommended | Falls back to keyword classifier |
| `EMAIL_HOST` | ✅ | SMTP host (smtp.gmail.com) |
| `EMAIL_PORT` | ✅ | 587 |
| `EMAIL_USER` | ✅ | Gmail address |
| `EMAIL_PASS` | ✅ | Gmail App Password (16 chars) |
| `OLLAMA_URL` | optional | Local Ollama endpoint |
| `OLLAMA_MODEL` | optional | e.g. `llama3.2` |

---

## 14. Deployment Guide

### Option A: Railway (Recommended — Easiest)

1. Create a Railway project
2. Add a **PostgreSQL** service → copy `DATABASE_URL`
3. Add a **Node** service → connect your GitHub repo
4. Set root directory to `server/`
5. Add all environment variables in the Railway dashboard
6. Deploy → Railway runs `npm start` (`node index.js`)

**For the client (Vercel):**
1. Import the same GitHub repo to Vercel
2. Set root directory to `client/`
3. Add env var: `VITE_API_URL=https://your-railway-server.railway.app`
4. Deploy → Vercel builds `npm run build`

### Option B: Render

- **Backend:** New Web Service → root `server/` → `npm start`
- **Database:** New PostgreSQL instance
- **Frontend:** New Static Site → `client/` → build command `npm run build` → publish `dist/`

### Option C: VPS (Ubuntu + Nginx + PM2)

```bash
# Install Node 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and install
git clone https://github.com/your/ps-crm.git
cd ps-crm/server && npm install
cd ../client && npm install && npm run build

# Start server with PM2
cd ../server
pm2 start index.js --name ps-crm-server
pm2 save && pm2 startup

# Nginx config
server {
  listen 80;
  server_name your-domain.com;

  # Serve React build
  location / {
    root /path/to/client/dist;
    try_files $uri /index.html;
  }

  # Proxy API
  location /api {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
  }

  # Proxy WebSocket (Socket.io)
  location /socket.io {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

### Production Checklist

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` is 64+ random chars (`crypto.randomBytes(64).toString('hex')`)
- [ ] `CLIENT_ORIGIN` = actual frontend domain
- [ ] PostgreSQL SSL enabled (auto-enabled when host is not localhost)
- [ ] Gmail App Password (not real password) for SMTP
- [ ] `uploads/` directory exists and is writable on VPS
- [ ] Seed the database: `node seed.js`
- [ ] Run `npm audit` — fix critical vulnerabilities

---

## 15. Cron Jobs

**File:** `services/workflowService.js`

| Job | Schedule | Logic |
|---|---|---|
| `rebalanceUnassigned()` | Every 15 minutes | Finds all `new` complaints with no officer, retries `autoAssignOfficer()` in P1→P2→P3 order |
| `checkAndEscalate()` | Every 30 minutes | Finds all non-resolved complaints past their SLA deadline, sets `pending_escalation`, notifies collector |

Both cron jobs are registered in `index.js` on server start:
```js
cron.schedule('*/15 * * * *', rebalanceUnassigned);
cron.schedule('*/30 * * * *', checkAndEscalate);
```

---

## 16. Demo Accounts & Test Data

Run `node seed.js` in the `server/` directory to populate the database with demo data.

All passwords: **`password123`**

| Email | Role | Department |
|---|---|---|
| admin@pscrm.in | Super Admin | — |
| collector@pscrm.in | Collector | — |
| head.water@pscrm.in | Dept Head | Water (d1) |
| head.roads@pscrm.in | Dept Head | Roads (d2) |
| ravi@water.in | Field Officer | Water (d1) |
| amit@roads.in | Field Officer | Roads (d2) |
| priya@electric.in | Field Officer | Electricity (d3) |
| sunita@waste.in | Field Officer | Waste (d4) |
| rahul@example.com | Citizen | — |

### Seed Behavior
- All seeded users are set to `active = TRUE`, `email_verified = TRUE`
- Uses `ON CONFLICT DO UPDATE` — safe to re-run multiple times
- Creates a test complaint for end-to-end testing

---

*Documentation generated: March 2026 · PS-CRM v2.0*  
*Maintained by the PS-CRM Development Team*
