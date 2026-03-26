/**
 * workflowService.js
 *
 * Smart auto-assignment engine + SLA logic.
 *
 * Assignment algorithm (priority order):
 *  1. Officer in the complaint's department with fewest active complaints
 *  2. Tie-break: officer who was assigned least recently
 *  3. If no officer is available in the department, leave unassigned and alert dept_head
 *
 * The officer_load table keeps a live active_count per officer so we never
 * have to do a full table scan to find the least-loaded officer.
 */

const { query, getClient } = require('../models/db');
const { createNotification } = require('./notificationService');

const SLA_HOURS = { P1: 24, P2: 72, P3: 168 };

// ── SLA helpers ───────────────────────────────────────────────────────────────

function getSLADeadline(priority) {
  const hours = SLA_HOURS[priority] || 72;
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d;
}

function getSLAStatus(complaint) {
  const now = new Date();
  const deadline = new Date(complaint.sla_deadline || complaint.slaDeadline);
  const diffHours = (deadline - now) / 3_600_000;

  const status = complaint.status;
  if (status === 'resolved' || status === 'closed') return 'met';
  if (diffHours < 0)  return 'breached';
  if (diffHours < 4)  return 'critical';
  if (diffHours < 12) return 'warning';
  return 'ok';
}

// ── Auto-assignment engine ────────────────────────────────────────────────────

/**
 * autoAssignOfficer(complaintId, departmentId, priority)
 *
 * Picks the best available officer using a weighted score:
 *   score = active_count * 10 + hours_since_last_assignment
 * Lower score = more suitable.
 *
 * Returns the assigned officer row, or null if none available.
 * Updates officer_load atomically inside a transaction.
 */
async function autoAssignOfficer(complaintId, departmentId, priority, complaintLocation = '') {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Build a location-aware weighted score:
    //  - active_count * 10         → fewer active complaints = better
    //  - hours_since_last_assigned → older = better (tie-breaker)
    //  - location_bonus: -50 if officer's service_area matches the complaint location
    const locationPattern = `%${(complaintLocation || '').toLowerCase()}%`;

    const { rows: candidates } = await client.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.service_area,
        COALESCE(ol.active_count, 0)   AS active_count,
        COALESCE(ol.last_assigned, '1970-01-01') AS last_assigned,
        (COALESCE(ol.active_count, 0) * 10)
          + EXTRACT(EPOCH FROM (NOW() - COALESCE(ol.last_assigned, '1970-01-01'))) / -3600.0
          - CASE
              WHEN $2 <> '' AND LOWER(u.service_area) LIKE $2 THEN 50
              ELSE 0
            END
        AS score
      FROM users u
      LEFT JOIN officer_load ol ON ol.officer_id = u.id
      WHERE u.department_id = $1
        AND u.role = 'field_officer'
        AND u.active = TRUE
      ORDER BY score ASC
      LIMIT 1
      FOR UPDATE OF u SKIP LOCKED
    `, [departmentId, locationPattern]);

    if (!candidates.length) {
      await client.query('ROLLBACK');

      // Notify all dept_heads in this department that no officer is available
      const { rows: heads } = await query(
        `SELECT id FROM users WHERE department_id = $1 AND role IN ('dept_head','collector','super_admin') AND active = TRUE`,
        [departmentId]
      );
      for (const head of heads) {
        await createNotification(
          head.id,
          'system',
          `⚠ No available officer in department for complaint. Manual assignment needed.`,
          complaintId
        );
      }
      return null;
    }

    const officer = candidates[0];
    const isLocalMatch = complaintLocation && officer.service_area &&
      officer.service_area.toLowerCase().includes(complaintLocation.toLowerCase());

    // Upsert officer_load — increment active count, update last_assigned
    await client.query(`
      INSERT INTO officer_load (officer_id, active_count, last_assigned)
      VALUES ($1, 1, NOW())
      ON CONFLICT (officer_id) DO UPDATE
        SET active_count  = officer_load.active_count + 1,
            last_assigned = NOW()
    `, [officer.id]);

    // Assign the complaint
    await client.query(`
      UPDATE complaints
        SET assigned_to = $1,
            status      = 'assigned',
            updated_at  = NOW()
      WHERE id = $2
    `, [officer.id, complaintId]);

    // Record in history
    const locationNote = isLocalMatch ? ` (local match: ${officer.service_area})` : '';
    await client.query(`
      INSERT INTO complaint_history (complaint_id, status, user_id, note)
      VALUES ($1, 'assigned', 'system', $2)
    `, [complaintId, `Auto-assigned to ${officer.name} (${officer.active_count} active complaints)${locationNote}`]);

    await client.query('COMMIT');
    console.log(`[Assignment] Complaint ${complaintId} → Officer ${officer.name} (load: ${parseInt(officer.active_count) + 1})${locationNote}`);
    return officer;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Assignment] Failed:', err.message);
    return null;
  } finally {
    client.release();
  }
}

/**
 * decrementOfficerLoad(officerId)
 * Call this when a complaint is resolved/closed so the officer's active_count drops.
 */
async function decrementOfficerLoad(officerId) {
  if (!officerId) return;
  await query(`
    UPDATE officer_load
      SET active_count = GREATEST(0, active_count - 1)
    WHERE officer_id = $1
  `, [officerId]).catch(e => console.error('[Load] Decrement failed:', e.message));
}

/**
 * rebalanceUnassigned()
 * Cron job: find complaints that are still 'new' (auto-assign may have found no
 * officer at submission time) and retry assignment every 15 minutes.
 */
async function rebalanceUnassigned() {
  const { rows } = await query(`
    SELECT id, department_id, priority
    FROM complaints
    WHERE status = 'new' AND assigned_to IS NULL
    ORDER BY
      CASE priority WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END,
      created_at ASC
    LIMIT 50
  `);

  if (!rows.length) return;
  console.log(`[Rebalance] Attempting to assign ${rows.length} unassigned complaint(s)…`);

  for (const c of rows) {
    const officer = await autoAssignOfficer(c.id, c.department_id, c.priority);
    if (officer) {
      // Notify the citizen their complaint was just assigned
      const { rows: [complaint] } = await query(
        `SELECT user_id, ticket_id FROM complaints WHERE id = $1`, [c.id]
      );
      if (complaint) {
        await createNotification(
          complaint.user_id,
          'assigned',
          `Your complaint #${complaint.ticket_id} has been assigned to an officer and is now being reviewed.`,
          c.id
        );
        await createNotification(
          officer.id,
          'assigned',
          `Complaint #${complaint.ticket_id} has been assigned to you.`,
          c.id
        );
      }
    }
  }
}

/**
 * checkAndEscalate()
 * Cron job every 30 minutes: escalate complaints that have breached SLA.
 */
async function checkAndEscalate() {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { rows: breached } = await client.query(`
      SELECT id, ticket_id, assigned_to, user_id
      FROM complaints
      WHERE status NOT IN ('resolved','closed','escalated')
        AND sla_deadline < NOW()
      FOR UPDATE SKIP LOCKED
    `);

    if (!breached.length) { await client.query('ROLLBACK'); return; }

    for (const c of breached) {
      await client.query(`
        UPDATE complaints
          SET status = 'escalated', escalated_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `, [c.id]);

      await client.query(`
        INSERT INTO complaint_history (complaint_id, status, user_id, note)
        VALUES ($1, 'escalated', 'system', 'Auto-escalated: SLA deadline breached')
      `, [c.id]);

      // Notify the assigned officer (or citizen if unassigned) + all dept_heads
      const notifyId = c.assigned_to || c.user_id;
      await createNotification(
        notifyId, 'escalation',
        `Complaint #${c.ticket_id} escalated — SLA deadline has passed.`,
        c.id
      );
    }

    await client.query('COMMIT');
    console.log(`[CRON] Escalated ${breached.length} complaint(s)`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[CRON] Escalation error:', err.message);
  } finally {
    client.release();
  }
}

/**
 * addStatusHistory(complaintId, status, userId, note)
 * Simple helper used by routes.
 */
async function addStatusHistory(complaintId, status, userId, note = '') {
  await query(
    `INSERT INTO complaint_history (complaint_id, status, user_id, note) VALUES ($1,$2,$3,$4)`,
    [complaintId, status, String(userId), note]
  );
}

module.exports = {
  getSLADeadline,
  getSLAStatus,
  autoAssignOfficer,
  decrementOfficerLoad,
  rebalanceUnassigned,
  checkAndEscalate,
  addStatusHistory,
  SLA_HOURS,
};
