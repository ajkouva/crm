-- PS-CRM PostgreSQL Database Schema
-- Run this in your PostgreSQL terminal or using a client to setup the database.

-- 1. Departments (Seeded once)
CREATE TABLE IF NOT EXISTS departments (
  id   VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20)  NOT NULL UNIQUE
);

-- 2. Users
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
  active        BOOLEAN      NOT NULL DEFAULT TRUE,
  email_verified BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 3. Complaints
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
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  parent_id         UUID         REFERENCES complaints(id),
  duplicate_count   INT          DEFAULT 0
);

-- 4. Status history
CREATE TABLE IF NOT EXISTS complaint_history (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID        NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  status       VARCHAR(30) NOT NULL,
  user_id      VARCHAR(64) NOT NULL,   -- UUID or 'system'
  note         TEXT        DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Comments
CREATE TABLE IF NOT EXISTS complaint_comments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID        NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name    VARCHAR(100),
  role         VARCHAR(20),
  text         TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(30) NOT NULL,
  message      TEXT        NOT NULL,
  complaint_id UUID        REFERENCES complaints(id) ON DELETE SET NULL,
  read         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action     VARCHAR(100) NOT NULL,
  user_id    VARCHAR(64),
  user_role  VARCHAR(20),
  details    JSONB,
  ip         VARCHAR(60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Officer load
CREATE TABLE IF NOT EXISTS officer_load (
  officer_id      UUID  PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  active_count    INT   NOT NULL DEFAULT 0,
  last_assigned   TIMESTAMPTZ
);

-- 9. Indexes for Optimization
CREATE INDEX IF NOT EXISTS idx_complaints_user      ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_dept      ON complaints(department_id);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned  ON complaints(assigned_to);
CREATE INDEX IF NOT EXISTS idx_complaints_status    ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_sla       ON complaints(sla_deadline) WHERE status NOT IN ('resolved','closed');
CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_history_complaint    ON complaint_history(complaint_id);

-- 10. Update 'updated_at' Automations
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_complaints_updated_at ON complaints;
CREATE TRIGGER trg_complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 11. Initial Seeding Data
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
