const express = require('express');
const { query } = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

const notifRouter = express.Router();
const deptRouter  = express.Router();

// ── Notifications ─────────────────────────────────────────────────────────────

notifRouter.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

notifRouter.put('/read-all', authMiddleware, async (req, res, next) => {
  try {
    await query(`UPDATE notifications SET read = TRUE WHERE user_id = $1`, [req.user.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

notifRouter.put('/:id/read', authMiddleware, async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ── Departments ───────────────────────────────────────────────────────────────

deptRouter.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT * FROM departments ORDER BY name`);
    res.json(rows);
  } catch (err) { next(err); }
});

deptRouter.get('/:id/officers', authMiddleware, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT u.id, u.name, u.email, u.role, u.department_id,
             COALESCE(ol.active_count, 0) AS active_count
      FROM users u
      LEFT JOIN officer_load ol ON ol.officer_id = u.id
      WHERE u.department_id = $1
        AND u.role IN ('field_officer','dept_head')
        AND u.active = TRUE
      ORDER BY COALESCE(ol.active_count, 0) ASC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = { notifRouter, deptRouter };
