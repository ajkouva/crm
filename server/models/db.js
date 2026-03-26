/**
 * db.js — PostgreSQL connection + schema bootstrap
 *
 * Uses the `pg` Pool for connection pooling.
 * On first run, `initDB()` creates all tables and seeds departments.
 * Every other module imports { query, getClient, initDB } from here.
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') || process.env.NODE_ENV === 'development'
    ? false
    : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/** Run a query with optional params. Returns pg QueryResult. */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const dur = Date.now() - start;
    if (dur > 500) console.warn(`[DB] Slow query (${dur}ms):`, text.slice(0, 80));
    return res;
  } catch (err) {
    console.error('[DB] Query error:', err.message, '\nSQL:', text.slice(0, 200));
    throw err;
  }
}

/** Get a client from the pool for transactions. Remember to release(). */
async function getClient() {
  return pool.connect();
}

// ── Schema ────────────────────────────────────────────────────────────────────

const SCHEMA = `
-- Users
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(254) UNIQUE NOT NULL,
  phone         VARCHAR(20)  DEFAULT '',
  password_hash TEXT         NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'citizen'
                CHECK (role IN ('citizen','field_officer','dept_head','collector','super_admin')),
  department_id VARCHAR(10)  REFERENCES departments(id) ON DELETE SET NULL,
  aadhaar       VARCHAR(12),
  service_area  VARCHAR(200) DEFAULT '',
  active        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Departments (seeded once)
CREATE TABLE IF NOT EXISTS departments (
  id   VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20)  NOT NULL UNIQUE
);

-- Complaints
CREATE TABLE IF NOT EXISTS complaints (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id         VARCHAR(30) NOT NULL UNIQUE,
  user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  citizen_name      VARCHAR(100),
  title             VARCHAR(200) NOT NULL,
  description       TEXT         NOT NULL,
  location          VARCHAR(300) DEFAULT '',
  lat               NUMERIC(10, 7),
  lng               NUMERIC(10, 7),
  category          VARCHAR(100) DEFAULT 'General',
  department_id     VARCHAR(10)  REFERENCES departments(id),
  priority          VARCHAR(5)   NOT NULL DEFAULT 'P2'
                    CHECK (priority IN ('P1','P2','P3')),
  status            VARCHAR(30)  NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new','assigned','in_progress','pending_escalation','escalated','resolved','closed')),
  assigned_to       UUID         REFERENCES users(id) ON DELETE SET NULL,
  language          VARCHAR(5)   DEFAULT 'en',
  media_urls        JSONB        DEFAULT '[]'::jsonb,
  ai_classification JSONB,
  sla_deadline      TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,
  escalated_at      TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ai_summary        TEXT,
  translated_description TEXT
);

-- Status history (replaces the embedded history array)
CREATE TABLE IF NOT EXISTS complaint_history (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID        NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  status       VARCHAR(30) NOT NULL,
  user_id      VARCHAR(64) NOT NULL,   -- UUID or 'system'
  note         TEXT        DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments
CREATE TABLE IF NOT EXISTS complaint_comments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID        NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name    VARCHAR(100),
  role         VARCHAR(20),
  text         TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(30) NOT NULL,
  message      TEXT        NOT NULL,
  complaint_id UUID        REFERENCES complaints(id) ON DELETE SET NULL,
  read         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action     VARCHAR(100) NOT NULL,
  user_id    VARCHAR(64),
  user_role  VARCHAR(20),
  details    JSONB,
  ip         VARCHAR(60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-assignment queue: tracks per-officer load for smart round-robin
CREATE TABLE IF NOT EXISTS officer_load (
  officer_id      UUID  PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  active_count    INT   NOT NULL DEFAULT 0,
  last_assigned   TIMESTAMPTZ
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_complaints_user      ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_dept      ON complaints(department_id);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned  ON complaints(assigned_to);
CREATE INDEX IF NOT EXISTS idx_complaints_status    ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_sla       ON complaints(sla_deadline) WHERE status NOT IN ('resolved','closed');
CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_history_complaint    ON complaint_history(complaint_id);

-- Performance indices for Auto-Assignment
CREATE INDEX IF NOT EXISTS idx_users_assignment      ON users(department_id, role, active);
CREATE INDEX IF NOT EXISTS idx_officer_load_balance  ON officer_load(active_count, last_assigned);

-- Resolved media (idempotent additions)
ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS resolved_media_urls JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS duplicate_count     INT   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_id           UUID  REFERENCES complaints(id) ON DELETE SET NULL,
  -- F1: Citizen rating
  ADD COLUMN IF NOT EXISTS rating              INT   CHECK (rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS rating_feedback     TEXT,
  ADD COLUMN IF NOT EXISTS rated_at            TIMESTAMPTZ,
  -- F3: Appeal flow
  ADD COLUMN IF NOT EXISTS is_appealed         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS appeal_reason       TEXT,
  ADD COLUMN IF NOT EXISTS appealed_at         TIMESTAMPTZ;

-- F2: Password reset tokens on users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_token         TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;
`;

const SEED_DEPARTMENTS = `
INSERT INTO departments (id, name, code) VALUES
  ('d1', 'Water Supply',           'WATER'),
  ('d2', 'Roads & Infrastructure', 'ROADS'),
  ('d3', 'Sanitation',             'SANITATION'),
  ('d4', 'Electricity',            'ELECTRICITY'),
  ('d5', 'Public Safety',          'SAFETY'),
  ('d6', 'Health Services',        'HEALTH'),
  ('d7', 'Education',              'EDUCATION'),
  ('d8', 'Transport',              'TRANSPORT')
ON CONFLICT (id) DO NOTHING;
`;

// ── Updated_at trigger ────────────────────────────────────────────────────────
const TRIGGER = `
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_complaints_updated_at
    BEFORE UPDATE ON complaints
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`;

async function initDB() {
  console.log('[DB] Running schema bootstrap…');
  // departments must exist before users can reference it
  await pool.query(`CREATE TABLE IF NOT EXISTS departments (
    id   VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20)  NOT NULL UNIQUE
  )`);
  await pool.query(SCHEMA);
  await pool.query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]'::jsonb;`);
  
  await pool.query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS lat NUMERIC(10, 7);`);
  await pool.query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS lng NUMERIC(10, 7);`);
  await pool.query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES complaints(id);`);
  await pool.query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS duplicate_count INT DEFAULT 0;`);
  await pool.query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolved_media_urls JSONB DEFAULT '[]'::jsonb;`);
  
  // Add email_verified for advanced auth
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;`);

  await pool.query(TRIGGER);
  await pool.query(SEED_DEPARTMENTS);

  // F4: AI Translation & Summary support
  await pool.query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS ai_summary TEXT;`);
  await pool.query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS translated_description TEXT;`);

  // Add service_area for location-based officer assignment
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS service_area VARCHAR(200) DEFAULT '';`);

  console.log('[DB] Schema ready ✓');
}

module.exports = { query, getClient, initDB, pool };
