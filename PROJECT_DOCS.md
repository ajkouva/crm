# PS-CRM: Comprehensive Project Documentation

**PS-CRM** is a next-generation Public Service Complaint Management System. It serves as a unified digital bridge between citizens and government departments, allowing for transparent reporting, intelligent routing, and strict SLA (Service Level Agreement) enforcement.

---

## 🚀 1. Core Features

### For Citizens:
- **Public Submission Portal:** submit complaints with photos, GPS location, and detailed descriptions without needing an account.
- **Ticket Tracking:** Citizens receive a unique tracking ID (e.g., `CMP-1029`) to monitor real-time progress.
- **Transparency Dashboard:** A public analytics board showing aggregate metrics like total resolved cases and average resolution times.
- **Satisfaction Ratings & Appeals:** Once resolved, citizens can rate the service or appeal the resolution if unsatisfied.

### For Government Officials:
- **AI-Powered Triaging:** Google Gemini AI automatically reads incoming complaints and categorizes them (e.g., Water, Roads, Sanitation) to eliminate manual sorting.
- **Smart Auto-Assignment:** The system automatically forwards complaints to the least-burdened Field Officer within the correct department.
- **Real-time Notifications:** Web sockets push instant browser alerts for new assignments or escalations.
- **Automated Escalations (SLA tracking):** A background chron-job routinely checks if complaints have breached their legal resolution deadlines (e.g., 24 hours for P1 issues) and escalates them to higher-ups automatically.
- **Centralized Analytics:** Dynamic charts and graphs breaking down department efficiency, geographic hotspots, and officer workloads.

---

## ⚙️ 2. How It Works (The Core Workflow)

1. **Submission Initiation:** A citizen visits the public portal and submits an issue with an attached photo.
2. **AI Processing:** The backend intercepts the raw text and asks the AI Engine to classify it into a predefined government department category and assert an urgency priority (P1, P2, P3).
3. **Algorithmic Assignment:** 
   - The database queries all "Field Officers" available in the target department.
   - It calculates the workload of each officer.
   - The system locks the chosen officer and assigns them the complaint instantly.
4. **Resolution Phase:** The assigned officer receives a push notification, travels to the location, fixes the issue, and uploads "Resolution Evidence" (a photo proving it is fixed).
5. **Quality Review:** The complaint goes to "Pending Approval". The Department Head reviews the evidence and officially closes the ticket.
6. **Citizen Feedback:** The citizen is informed and allowed to rate the resolution.

---

## 🏛️ 3. Frontend Architecture

The frontend is a strictly decoupled **Single Page Application (SPA)** that focuses strictly on UI/UX, routing, and state management.

- **Framework:** React 18, utilizing Vite for lightning-fast compilation.
- **Routing:** React Router DOM handles protected vs. public routes.
- **State Management:** Custom React Context hooks manage global user sessions and theme toggling (Light/Dark mode).
- **Styling:** A completely custom, dependency-free CSS-in-JS and Variable-driven system (`index.css`). It follows a "Neo-Governmental" modern glassmorphism aesthetic.
- **Internationalization:** Multi-language support using `react-i18next`.
- **Charts:** Implemented using `recharts` for rich, interactive SVG analytics.
- **Socket Connection:** Established globally to listen for incoming real-time notifications.

---

## 🖥️ 4. Backend Architecture

The server acts as the central nervous system, handling heavy logic, CRON jobs, auth, and database transactions.

- **Framework:** Node.js with Express framework.
- **Authentication:** Stateless architecture using JSON Web Tokens (JWT). Passwords are cryptographically hashed using `bcrypt`.
- **Media Uploads:** Handled via `multer`, securely storing evidence images on the local disk (or cloud bucket) and serving them via static routes.
- **Background Jobs (CRON):** Scheduled tasks run continuously:
  - Checking for unassigned complaints to forcibly re-route them.
  - Checking for breaches in SLA deadlines to trigger automated escalations.
- **WebSockets:** Integrated `socket.io` server attached to the Express HTTP server to push live events to connected clients.
- **AI Service Wrapper:** A dedicated module intercepts requests and securely communicates with Google's Gemini LLM.

---

## 🗄️ 5. Database Structure (PostgreSQL)

The system uses a highly relational SQL structure designed for ACID compliance to prevent data races during assignments.

### Primary Entities:

- **Users Table:** Stores credentials, encrypted passwords, roles (Citizen, Officer, Head), and department IDs.
- **Departments Table:** Stores government divisions (e.g., Water Board, Sanitation).
- **Complaints Table:** The central table holding descriptions, GPS coordinates, status (`new`, `assigned`, `resolved`), AI categories, and current assignees.
- **Complaint History Table:** Append-only ledger tracking every single state change to create an un-deletable audit trail and timeline.
- **Officer Load Table:** A high-performance read-model tracking exactly how many open tickets a specific officer currently holds to calculate algorithm scores.
- **Audit Logs Table:** Tracks destructive/critical actions by Admins to ensure governmental accountability.

---

## 📁 6. Folder Structure

```text
ps-crm-final/
├── client/                     # Frontend Workspace
│   ├── public/                 # Static assets (Logos, Icons)
│   ├── src/
│   │   ├── components/         # Reusable UI (Sidebar, Dropdowns, Charts)
│   │   ├── context/            # React Contexts (Auth, Theme)
│   │   ├── pages/              # Full-page views (Dashboard, Analytics, Submit)
│   │   ├── utils/              # API wrappers and formatting helpers
│   │   ├── App.jsx             # Root layout and Router logic
│   │   └── main.jsx            # React mounting point
│   └── vite.config.js          # Build configuration
│
└── server/                     # Backend Workspace
    ├── middleware/             # Request interceptors (Auth Gate, Rate Limiters)
    ├── models/                 # Database connection drivers and queries
    ├── routes/                 # Separated REST API endpoints
    ├── services/               # Heavy business logic (AI, Sockets, Jobs)
    ├── uploads/                # File storage for user evidence photos
    ├── index.js                # Server entry point and HTTP startup
    └── seed.js                 # Initial data populator for new setups
```

---

## 🔐 7. Roles and Permissions

Data access is strictly segregated based on the user's role:

- **Anonymous (Citizen):** Can submit complaints, track them via ID, and view global transparency metrics.
- **Field Officer:** Can view ONLY complaints assigned locally to them. Allowed to upload resolution evidence and mark tickets as "Pending Approval".
- **Department Head:** Oversees an entire specific department. Can manually re-assign complaints, view their department's analytics, and approve/reject resolutions submitted by their officers.
- **Collector / Super Admin:** Has omnipotent view over the system. Can create logic rules, create new departments, view high-level global analytics, and execute system-wide audit checks.
