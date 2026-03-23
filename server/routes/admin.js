const express = require('express');
const { query } = require('../models/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Only Super Admins & Collectors can access these routes
router.use(authMiddleware);
router.use(requireRole('super_admin', 'collector'));

// ── Users Management ──────────────────────────────────────────────────────────

// GET all users (for assigning roles, etc.)
router.get('/users', async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT u.id, u.name, u.email, u.phone, u.role, u.department_id, u.active, d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

// PUT update user role & department
router.put('/users/:id', async (req, res, next) => {
  try {
    const { role, departmentId, active } = req.body;
    const { id } = req.params;

    const { rows } = await query(`
      UPDATE users 
      SET 
        role = COALESCE($1, role), 
        department_id = COALESCE($2, department_id),
        active = COALESCE($3, active)
      WHERE id = $4
      RETURNING id, name, email, role, department_id, active
    `, [role, departmentId, active, id]);

    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ── Departments Management ────────────────────────────────────────────────────

// POST create department
router.post('/departments', async (req, res, next) => {
  try {
    const { id, name, code } = req.body;
    if (!id || !name || !code) return res.status(400).json({ error: 'ID, Name, and Code are required' });

    const { rows } = await query(`
      INSERT INTO departments (id, name, code) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `, [id, name, code]);

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Department ID or Code already exists' });
    next(err);
  }
});

// PUT update department
router.put('/departments/:id', async (req, res, next) => {
  try {
    const { name, code } = req.body;
    const { rows } = await query(`
      UPDATE departments 
      SET name = COALESCE($1, name), code = COALESCE($2, code)
      WHERE id = $3
      RETURNING *
    `, [name, code, req.params.id]);

    if (!rows.length) return res.status(404).json({ error: 'Department not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE department
router.delete('/departments/:id', async (req, res, next) => {
  try {
    const { rowCount } = await query(`DELETE FROM departments WHERE id = $1`, [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Department not found' });
    res.json({ success: true });
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'Cannot delete department with active users or complaints' });
    next(err);
  }
});

module.exports = router;
