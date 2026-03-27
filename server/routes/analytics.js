const express = require('express');
const { query } = require('../models/db');
const { authMiddleware } = require('../middleware/auth');
const { getSLAStatus } = require('../services/workflowService');

const router = express.Router();

function deptFilter(user) {
  if (user.role === 'field_officer') return { clause: 'AND assigned_to = $1', val: user.id };
  if (user.role === 'dept_head')     return { clause: 'AND department_id = $1', val: user.departmentId };
  if (user.role === 'citizen')       return { clause: 'AND user_id = $1', val: user.id };
  return { clause: '', val: null };
}

router.get('/public/stats', async (req, res, next) => {
  try {
    const { rows: stats } = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved,
        AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - created_at))) FILTER (WHERE status IN ('resolved','closed')) as avg_resolution_seconds
      FROM complaints
    `);
    
    res.json({
      total: parseInt(stats[0].total) || 0,
      resolved: parseInt(stats[0].resolved) || 0,
      avgResolutionHours: Math.round((parseFloat(stats[0].avg_resolution_seconds) || 0) / 3600)
    });
  } catch (e) { next(e); }
});

router.get('/public/complaints', async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT 
        id, ticket_id, title, category, location, status, priority, 
        created_at, resolved_at, media_urls, rating, rating_feedback
      FROM complaints
      ORDER BY created_at DESC
      LIMIT 100
    `);
    
    res.json(rows.map(r => ({
      ...r,
      citizen_name: 'Citizen #' + r.id.split('-')[0], // Redact PII
    })));
  } catch (e) { next(e); }
});

router.get('/overview', authMiddleware, async (req, res, next) => {
  try {
    const { clause, val } = deptFilter(req.user);
    const params = val ? [val] : [];

    const base = `FROM complaints WHERE 1=1 ${clause}`;
    const [total, resolved, escalated, todayRec, todayRes, slaData, avgRes] = await Promise.all([
      query(`SELECT COUNT(*) ${base}`, params),
      query(`SELECT COUNT(*) ${base} AND status IN ('resolved','closed')`, params),
      query(`SELECT COUNT(*) ${base} AND status = 'escalated'`, params),
      query(`SELECT COUNT(*) ${base} AND created_at >= NOW()::date`, params),
      query(`SELECT COUNT(*) ${base} AND resolved_at >= NOW()::date`, params),
      query(`SELECT COUNT(*) ${base} AND status NOT IN ('resolved','closed') AND sla_deadline < NOW()`, params),
      query(`SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) AS avg_h ${base} AND resolved_at IS NOT NULL`, params),
    ]);

    const pending = parseInt(total.rows[0].count) - parseInt(resolved.rows[0].count);
    const breach  = parseInt(slaData.rows[0].count);
    const slaCompliance = pending > 0 ? Math.round(((pending - breach) / pending) * 100) : 100;

    const result = {
      total:              parseInt(total.rows[0].count),
      resolved:           parseInt(resolved.rows[0].count),
      escalated:          parseInt(escalated.rows[0].count),
      pending,
      todayReceived:      parseInt(todayRec.rows[0].count),
      todayResolved:      parseInt(todayRes.rows[0].count),
      slaCompliance,
      slaBreach:          breach,
      avgResolutionHours: Math.round(avgRes.rows[0].avg_h || 0),
    };

    if (['field_officer', 'dept_head'].includes(req.user.role) && req.user.departmentId) {
      const dBase = `FROM complaints WHERE department_id = $1`;
      const [dT, dR, dP] = await Promise.all([
        query(`SELECT COUNT(*) ${dBase}`, [req.user.departmentId]),
        query(`SELECT COUNT(*) ${dBase} AND status IN ('resolved','closed')`, [req.user.departmentId]),
        query(`SELECT COUNT(*) ${dBase} AND status = 'escalated'`, [req.user.departmentId]),
      ]);
      result.deptStats = {
        total:    parseInt(dT.rows[0].count),
        resolved: parseInt(dR.rows[0].count),
        escalated: parseInt(dP.rows[0].count),
      };
    }

    res.json(result);
  } catch (err) { next(err); }
});

router.get('/trends', authMiddleware, async (req, res, next) => {
  try {
    const { clause, val } = deptFilter(req.user);
    const params = val ? [val] : [];

    const { rows } = await query(`
      SELECT
        TO_CHAR(gs.day, 'DD Mon') AS date,
        COUNT(c.id) FILTER (WHERE DATE_TRUNC('day', c.created_at) = gs.day)  AS received,
        COUNT(c.id) FILTER (WHERE DATE_TRUNC('day', c.resolved_at) = gs.day) AS resolved
      FROM GENERATE_SERIES(NOW()::date - 29, NOW()::date, '1 day'::interval) AS gs(day)
      LEFT JOIN complaints c ON (1=1 ${clause.replace(/^AND /, 'AND c.')})
      GROUP BY gs.day ORDER BY gs.day
    `, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/departments', authMiddleware, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        d.id, d.name, d.code,
        COUNT(c.id)                                           AS total,
        COUNT(c.id) FILTER (WHERE c.status IN ('resolved','closed'))      AS resolved,
        COUNT(c.id) FILTER (WHERE c.status NOT IN ('resolved','closed'))  AS pending,
        COUNT(c.id) FILTER (WHERE c.status NOT IN ('resolved','closed') AND c.sla_deadline < NOW()) AS breached,
        ROUND(AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/3600) FILTER (WHERE c.resolved_at IS NOT NULL)) AS avg_resolution_hours
      FROM departments d
      LEFT JOIN complaints c ON c.department_id = d.id
      GROUP BY d.id, d.name, d.code
      ORDER BY d.name
    `);

    const result = rows.map(d => {
      const pending = parseInt(d.pending);
      const breached = parseInt(d.breached);
      return {
        ...d,
        total:    parseInt(d.total),
        resolved: parseInt(d.resolved),
        pending,
        breached,
        slaRate:  pending > 0 ? Math.round(((pending - breached) / pending) * 100) : 100,
        avgResolutionHours: parseInt(d.avg_resolution_hours) || 0,
      };
    });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/categories', authMiddleware, async (req, res, next) => {
  try {
    const { clause, val } = deptFilter(req.user);
    const params = val ? [val] : [];
    const { rows } = await query(`
      SELECT category, COUNT(*) AS count
      FROM complaints
      WHERE 1=1 ${clause}
      GROUP BY category
      ORDER BY count DESC
      LIMIT 5
    `, params);
    res.json(rows.map(r => ({ ...r, count: parseInt(r.count) })));
  } catch (err) { next(err); }
});

router.get('/escalated', authMiddleware, async (req, res, next) => {
  try {
    const { clause, val } = deptFilter(req.user);
    const params = val ? [val] : [];
    const { rows } = await query(`
      SELECT * FROM complaints
      WHERE (status = 'escalated' OR sla_deadline < NOW())
        AND status NOT IN ('resolved','closed')
        ${clause}
      ORDER BY sla_deadline ASC
      LIMIT 20
    `, params);
    res.json(rows.map(c => ({ ...c, slaStatus: getSLAStatus(c) })));
  } catch (err) { next(err); }
});

// Officer load stats — for admins to see assignment distribution
router.get('/officer-load', authMiddleware, async (req, res, next) => {
  try {
    if (!['dept_head','collector','super_admin'].includes(req.user.role))
      return res.status(403).json({ error: 'Forbidden' });

    const { rows } = await query(`
      SELECT
        u.id, u.name, u.email,
        d.name AS department,
        COUNT(c.id) FILTER (WHERE c.status NOT IN ('resolved','closed')) AS active_count,
        ol.last_assigned,
        COUNT(c.id) FILTER (WHERE c.status IN ('resolved','closed')) AS resolved_total
      FROM users u
      LEFT JOIN officer_load ol ON ol.officer_id = u.id
      LEFT JOIN departments d   ON d.id = u.department_id
      LEFT JOIN complaints c    ON c.assigned_to = u.id
      WHERE u.role = 'field_officer' AND u.active = TRUE
      GROUP BY u.id, u.name, u.email, d.name, ol.last_assigned
      ORDER BY active_count DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
