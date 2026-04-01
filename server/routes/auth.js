const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, getClient } = require('../models/db');
const { authMiddleware } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimiter');
const { sendOtpEmail } = require('../utils/mailer');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ps-crm-secret';
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'ps-crm-secret')) {
  throw new Error('FATAL: JWT_SECRET is missing or insecure in production environment');
}
const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const authLimiter = rateLimit({ windowMs: 15 * 60000, max: 100, message: 'Too many auth attempts. Try again later.' });

function issueToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      role: user.role, 
      departmentId: user.department_id,
      active: user.active 
    },
    JWT_SECRET, { expiresIn: '7d' }
  );
}
function safeUser(u) {
  const { password_hash, ...safe } = u; return safe;
}

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    let { name, email, password, role = 'citizen', phone, departmentId, serviceArea } = req.body;

    name  = (name  || '').trim().slice(0, 100);
    email = (email || '').trim().toLowerCase().slice(0, 254);

    if (name.length < 2)            return res.status(400).json({ error: 'Full name required (min 2 chars)' });
    if (!EMAIL_RE.test(email))      return res.status(400).json({ error: 'Valid email required' });
    if ((password || '').length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const VALID_ROLES = ['citizen','field_officer','dept_head','collector','super_admin'];
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (['field_officer','dept_head'].includes(role) && !departmentId)
      return res.status(400).json({ error: 'Department required for officers' });

    const hash = await bcrypt.hash(password, 12);
    const otp  = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHashed = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { rows: existing } = await query(`SELECT id, email_verified FROM users WHERE email = $1`, [email]);
    if (existing.length > 0) {
      if (existing[0].email_verified) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      // If unverified, remove it so we can re-register with fresh OTP/data
      await query(`DELETE FROM users WHERE id = $1`, [existing[0].id]);
    }

    const { rows } = await query(`
      INSERT INTO users (name, email, phone, password_hash, role, department_id, service_area, active, email_verified, reset_token, reset_token_expires)
      VALUES ($1,$2,$3,$4,$5,$6,$7,FALSE,FALSE,$8,$9) RETURNING *
    `, [name, email, (phone || '').slice(0,20), hash, role, departmentId || null, (serviceArea || '').trim().slice(0, 200), otpHashed, otpExpiry]);

    // Send verification email (non-blocking — don't hang registration if SMTP fails)
    sendOtpEmail(email, otp, 'register').catch(e =>
      console.error('[AUTH] OTP email failed (non-fatal):', e.message)
    );

    res.status(201).json({ 
      success: true,
      message: 'Registration successful. Please verify your email with the 6-digit OTP sent.'
    });
  } catch (err) { next(err); }
});


// POST /api/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const email    = (req.body.email    || '').trim().toLowerCase();
    const password = req.body.password  || '';
    console.log(`[AUTH] Login attempt for: ${email}`);

    if (!email || !password) {
      console.log('[AUTH] Missing email or password');
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { rows } = await query(`SELECT * FROM users WHERE email = $1`, [email]);
    const user = rows[0];

    if (!user) console.log(`[AUTH] User not found: ${email}`);

    const dummy = '$2a$12$invalidhashpaddingtomakeittaketime000000000000000000000';
    const match = user ? await bcrypt.compare(password, user.password_hash)
                       : await bcrypt.compare(password, dummy);

    if (!user || !match) {
      console.log(`[AUTH] Invalid credentials for: ${email} (User found: ${!!user}, Match: ${match})`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.email_verified) {
      console.log(`[AUTH] Email unverified: ${email}`);
      return res.status(403).json({ error: 'Please verify your email address check your inbox for the code' });
    }

    // Inactive users are now allowed to log in! 
    // They will be restricted by authMiddleware on the backend, 
    // and routed to the PendingApproval screen by the frontend.

    console.log(`[AUTH] Login successful: ${email} (${user.role})`);
    res.json({ token: issueToken(user), user: safeUser(user) });
  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT * FROM users WHERE id = $1`, [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(safeUser(rows[0]));
  } catch (err) { next(err); }
});

// POST /api/auth/verify-email
router.post('/verify-email', authLimiter, async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

    const { rows } = await query(
      `SELECT id, role, reset_token, reset_token_expires, active, email_verified FROM users WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.email_verified) return res.status(400).json({ error: 'Email already verified' });
    if (!user.reset_token) return res.status(400).json({ error: 'No verification pending' });

    if (new Date() > new Date(user.reset_token_expires)) {
      return res.status(400).json({ error: 'Verification code expired' });
    }

    const valid = await bcrypt.compare(otp.trim(), user.reset_token);
    if (!valid) return res.status(400).json({ error: 'Invalid verification code' });

    // Only citizen roles auto-activate. Officers remain inactive until approved.
    const shouldActivate = user.role === 'citizen';

    await query(
      `UPDATE users SET email_verified = TRUE, active = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2`,
      [shouldActivate, user.id]
    );

    if (shouldActivate) {
      res.json({ success: true, message: 'Email verified. You can now log in.' });
    } else {
      res.json({ success: true, message: 'Email verified. Your account is pending admin approval.' });
    }
  } catch (err) { next(err); }
});


// GET /api/auth/users
router.get('/users', authMiddleware, async (req, res, next) => {
  try {
    if (!['super_admin','collector'].includes(req.user.role))
      return res.status(403).json({ error: 'Forbidden' });
    const { rows } = await query(`SELECT * FROM users ORDER BY created_at DESC`);
    res.json(rows.map(safeUser));
  } catch (err) { next(err); }
});

// POST /api/auth/skip-verification (citizen OTP bypass — only when SKIP_OTP_CITIZEN=true)
router.post('/skip-verification', authLimiter, async (req, res, next) => {
  try {
    if (process.env.SKIP_OTP_CITIZEN !== 'true') {
      return res.status(403).json({ error: 'OTP bypass is not enabled' });
    }

    const email = (req.body.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Valid email required' });

    const { rows } = await query(
      `SELECT id, role, email_verified FROM users WHERE email = $1`, [email]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.email_verified) return res.status(400).json({ error: 'Email already verified' });

    // Only citizens can skip OTP — officers still need manual approval
    if (user.role !== 'citizen') {
      return res.status(403).json({ error: 'Only citizen accounts can use OTP bypass' });
    }

    await query(
      `UPDATE users SET email_verified = TRUE, active = TRUE, reset_token = NULL, reset_token_expires = NULL WHERE id = $1`,
      [user.id]
    );

    console.log(`[AUTH] OTP bypass used for citizen: ${email}`);
    res.json({ success: true, message: 'Account activated. You can now log in.' });
  } catch (err) { next(err); }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', authLimiter, async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Valid email required' });

    const { rows } = await query(`SELECT id, email_verified FROM users WHERE email = $1`, [email]);
    if (!rows.length) return res.json({ success: true, message: 'If that email exists, a new code was sent.' });
    
    if (rows[0].email_verified) return res.status(400).json({ error: 'Email is already verified.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHashed = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await query(
      `UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3`,
      [otpHashed, otpExpiry, rows[0].id]
    );

    await sendOtpEmail(email, otp, 'register');

    res.json({
      success: true,
      message: 'Verification code resent.'
    });
  } catch (err) { next(err); }
});

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
// Step 1: Citizen enters email → we generate a 6-digit OTP (returned in dev mode).
// In production this would be sent via email.
router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const { rows } = await query(`SELECT id FROM users WHERE email = $1`, [email]);

    // Always return success to avoid user enumeration attacks
    if (!rows.length) {
      return res.json({ success: true, message: 'If that email exists, a reset code was sent.' });
    }

    // Generate a 6-digit OTP
    const otp    = Math.floor(100000 + Math.random() * 900000).toString();
    const hashed = await bcrypt.hash(otp, 10);
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await query(
      `UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3`,
      [hashed, expiry, rows[0].id]
    );

    // Send OTP email
    await sendOtpEmail(email, otp, 'reset');

    res.json({ 
      success: true, 
      message: 'If that email exists, a reset code was sent.'
    });

  } catch (err) { next(err); }
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────
// Step 2: Citizen enters OTP + new password → we verify and update.
router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const email    = (req.body.email    || '').trim().toLowerCase();
    const otp      = (req.body.otp      || '').trim();
    const password = (req.body.password || '');

    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Valid email required' });
    if (!otp)                   return res.status(400).json({ error: 'Reset code required' });
    if (password.length < 8)   return res.status(400).json({ error: 'Password must be at least 8 characters' });

    // Look up user and their unexpired token
    const { rows } = await query(
      `SELECT id, reset_token, reset_token_expires FROM users WHERE email = $1`,
      [email]
    );

    const user = rows[0];

    if (!user || !user.reset_token) {
      return res.status(400).json({ error: 'No reset request found for this email' });
    }

    if (new Date() > new Date(user.reset_token_expires)) {
      return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
    }

    const valid = await bcrypt.compare(otp, user.reset_token);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid reset code' });
    }

    // Update password and clear the reset token
    const newHash = await bcrypt.hash(password, 12);
    await query(
      `UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2`,
      [newHash, user.id]
    );

    res.json({ success: true, message: 'Password reset successful. You can now log in.' });

  } catch (err) { next(err); }
});

module.exports = router;
