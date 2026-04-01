# 🇮🇳 PS-CRM — Smart Public Service Complaint Management System

> A full-stack, production-ready complaint management platform for Indian government services — featuring real-time notifications, AI-powered classification, auto officer assignment, SLA enforcement, geospatial duplicate detection (100m radius), and a premium animated UI.

![Tech Stack](https://img.shields.io/badge/React_18_+_Vite-blue?logo=react) ![Node.js](https://img.shields.io/badge/Node.js_+_Express-green?logo=node.js) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql) ![GSAP](https://img.shields.io/badge/GSAP_Animations-88CE02?logo=greensock) ![Gemini AI](https://img.shields.io/badge/Gemini_AI-4285F4?logo=google)

---

## ✨ Features

### 👤 Citizen Features
- **Complaint Filing** — Submit complaints with title, description, category, location (manual or GPS), and media uploads (photos/videos up to 50MB)
- **Live Ticket Tracking** — Public tracking page with full status history
- **OTP Email Verification** — Secure 6-digit code registration flow with production bypass option
- **Multilingual Support** — English + Hindi (i18n via react-i18next, 10+ Indian languages structured)
- **Complaint Rating** — Rate resolution quality (1–5 stars + feedback)
- **Appeal System** — Re-open resolved complaints if unsatisfied
- **Transparency Dashboard** — Real-time public stats: total filed, resolved, avg resolution time

### 🧑‍💼 Officer & Admin Features
- **AI Auto-Assignment** — Complaints are automatically routed to the least-loaded officer in the correct department
- **Role-Based Dashboards** — Different views for Citizen, Field Officer, Dept Head, Collector, Super Admin
- **Status Workflow** — new → assigned → in_progress → escalated → resolved → closed
- **Media Evidence** — Officers can upload photos when resolving complaints
- **Complaint Comments** — Internal communication thread on each complaint
- **Analytics Dashboard** — Charts for category breakdown, SLA compliance, officer performance (Recharts)
- **Heatmap** — Leaflet.js geospatial heatmap of complaint hotspots
- **Admin Controls** — User management, department management, bulk operations
- **Audit Trail** — Every action logged with timestamp and user

### 🤖 AI Engine
- **Gemini AI Classification** — Identifies department, urgency, and generates multilingual summaries
- **Gibberish Detection** — Rejects low-quality or test inputs automatically
- **AI Duplicate Detection** — Geospatial (100m radius) + semantic matching; duplicates are **rejected before saving** — DB stays clean
- **Auto-Escalation** — When 3+ citizens report the same issue within 100m, the original complaint auto-escalates to P1
- **Fallback AI** — Keyword-based classification when Gemini is unavailable

### 🔔 Real-time System
- **Socket.io** — Live notifications pushed to all relevant users on complaint creation, assignment, and status changes
- **In-app Notifications** — Unread badge, notification center

### 🔒 Security
- **JWT Authentication** — 7-day tokens, role-based route guards
- **bcrypt Password Hashing** — 12 rounds
- **Email OTP Registration** — Prevents fake accounts (with env-gated bypass for production emergencies)
- **Rate Limiting** — Protects API endpoints from abuse
- **Input Sanitization** — All user input sanitized server-side
- **CORS** — Configurable per environment

### ⏱ SLA & Automation
| Priority | Deadline | Auto-Escalation |
|---|---|---|
| P1 (Critical) | 24 hours | ✅ |
| P2 (Normal) | 72 hours | ✅ |
| P3 (Low) | 7 days | ✅ |

| Cron | Interval | Purpose |
|---|---|---|
| Rebalance unassigned | Every 15 min | Retries complaints with no officer |
| SLA escalation check | Every 30 min | Auto-escalates breached complaints |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, React Router v6 |
| **State** | Zustand |
| **Animations** | GSAP 3 + ScrollTrigger + @gsap/react |
| **Charts** | Recharts |
| **Maps** | Leaflet.js + Leaflet.heat |
| **Realtime** | Socket.io Client |
| **i18n** | react-i18next |
| **Backend** | Node.js, Express |
| **Database** | PostgreSQL (pg Pool) |
| **Auth** | JWT + bcrypt |
| **Email** | Nodemailer (Gmail SMTP / STARTTLS) |
| **AI** | Google Gemini API + keyword fallback |
| **Cron** | node-cron |
| **File Uploads** | Multer |
| **Realtime** | Socket.io Server |

---

## 📁 Project Structure

```
ps-crm/
├── client/                         # React frontend (Vite)
│   ├── public/                     # Hero images
│   └── src/
│       ├── pages/
│       │   ├── PublicHome.jsx      # Landing page with GSAP animations
│       │   ├── AuthPage.jsx        # Login / Register / OTP / Skip Verify / Forgot Password
│       │   ├── Dashboard.jsx       # Role-aware main dashboard
│       │   ├── ComplaintsList.jsx  # Filterable complaints table
│       │   ├── ComplaintDetail.jsx # Full complaint + history + rating + appeal
│       │   ├── SubmitComplaint.jsx # AI-powered 3-step submission + duplicate banner
│       │   ├── Analytics.jsx       # Charts + heatmap
│       │   ├── AdminControls.jsx   # User/dept management
│       │   ├── Notifications.jsx   # Notification center
│       │   ├── TrackComplaint.jsx  # Public ticket tracker
│       │   ├── TransparencyDashboard.jsx
│       │   ├── InfoPages.jsx       # About / FAQ / Process
│       │   └── PendingApproval.jsx # Pending user screen
│       ├── components/
│       │   ├── Sidebar.jsx         # Collapsible role-aware nav
│       │   ├── PublicHeader.jsx    # Public nav with theme + language switcher
│       │   ├── CustomSelect.jsx    # Accessible dropdown
│       │   ├── GlobalLoader.jsx    # App-level loading spinner
│       │   ├── Skeleton.jsx        # Content skeleton loaders
│       │   ├── HeatmapWidget.jsx   # Leaflet heatmap
│       │   └── Icons.jsx           # SVG icon library
│       ├── store/
│       │   └── useAuthStore.js     # Zustand auth store
│       ├── utils/api.js            # API fetch wrapper (includes skipVerification)
│       └── i18n.js                 # i18next config
│
└── server/                         # Express backend
    ├── index.js                    # App entry, Socket.io, cron init
    ├── models/db.js                # pg Pool + schema bootstrap
    ├── routes/
    │   ├── auth.js                 # Register, Login, OTP verify, Skip-verify, Forgot PW
    │   ├── complaints.js           # Full CRUD + duplicate guard + assign + rate + appeal
    │   ├── analytics.js            # Charts + public stats
    │   └── misc.js                 # Departments, notifications, uploads
    ├── services/
    │   ├── workflowService.js      # Auto-assignment + SLA + cron logic
    │   ├── notificationService.js  # In-app + Socket.io notifications
    │   └── aiService.js            # Gemini AI + fallback classifier
    ├── middleware/
    │   ├── auth.js                 # JWT verification + requireRole
    │   ├── audit.js                # Action audit logger
    │   └── rateLimiter.js          # IP-based rate limiting
    ├── utils/mailer.js             # Nodemailer SMTP config
    ├── seed.js                     # Demo data seeder
    └── flush.js                    # Clear complaint data (keep users)
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Clone & install

```bash
git clone https://github.com/your-username/ps-crm.git
cd ps-crm

cd server && npm install
cd ../client && npm install
```

### 2. Configure environment

```bash
cd server
cp .env.example .env
# Edit .env — fill in DATABASE_URL, JWT_SECRET, GEMINI_API_KEY, EMAIL_*
```

### 3. Set up database

```bash
createdb pscrm
node seed.js     # Creates all tables + inserts demo data
```

### 4. Run

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

Frontend: http://localhost:5173  
API: http://localhost:3001

---

## 🔑 Demo Accounts (password: `password123`)

| Email | Role |
|---|---|
| admin@pscrm.in | Super Admin |
| collector@pscrm.in | Collector |
| head.water@pscrm.in | Dept Head (Water) |
| ravi@water.in | Field Officer (Water) |
| rahul@example.com | Citizen |

---

## ⚙️ Production Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | 64-char random string for JWT signing |
| `GEMINI_API_KEY` | Google Gemini API key for AI features |
| `EMAIL_USER` | Gmail address for OTP emails |
| `EMAIL_PASS` | Gmail App Password |
| `CLIENT_ORIGIN` | Frontend domain for CORS |
| `NODE_ENV` | Set to `production` |
| `SKIP_OTP_CITIZEN` | **`true`** to enable OTP bypass for citizens (use if email delivery is broken) |

### OTP Bypass (Production Emergency)

If email delivery is not working and citizens cannot verify their accounts, set:

```env
SKIP_OTP_CITIZEN=true
```

This enables a **"Skip Verification →"** button on the registration OTP screen. Citizens can activate their account without the code. The bypass:
- ✅ Only works for `citizen` role — officers still require proper verification
- ✅ Is **fully server-side gated** — removing the env var instantly disables it
- ✅ Logs every bypass usage to the server console

---

## 🔍 Duplicate Detection Logic

When a citizen submits a complaint with GPS coordinates:

1. The system queries active complaints in the **same category** from the **last 7 days**
2. It filters to those within **100 metres** (Haversine formula)
3. If nearby complaints are found, **Gemini AI** semantically compares the descriptions
4. If a match is confirmed:
   - The new complaint is **rejected** — nothing is saved to the DB
   - The original complaint's `duplicate_count` is incremented
   - If `duplicate_count >= 2` (3+ people reported the same issue), the original is **auto-escalated to P1**
   - The citizen sees a banner with the existing ticket ID and a direct Track link

---

## 🌐 Deployment

See [DOCUMENTATION.md](./DOCUMENTATION.md) for a full deployment guide (Railway, Render, Vercel, Supabase).

### Key production settings
1. Set `NODE_ENV=production` in server `.env`
2. Set `CLIENT_ORIGIN` to your frontend domain
3. Use a 64-char random `JWT_SECRET`
4. Use a PostgreSQL managed service (Supabase, Neon, Railway)
5. Enable Gmail App Password for SMTP

---

## 📄 License

Government of India Initiative — Digital India Programme  
Built with ❤️ for every Indian citizen.
