const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, getClient } = require('../models/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { classifyComplaint, detectDuplicates, DEPT_TO_ID } = require('../services/aiService');
const { getSLADeadline, getSLAStatus, autoAssignOfficer, decrementOfficerLoad, addStatusHistory } = require('../services/workflowService');
const { notifyComplaintCreated, notifyAssigned, notifyStatusChange } = require('../services/notificationService');
const { rateLimit } = require('../middleware/rateLimiter');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { uploadMedia } = require('../services/storageService');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  }
});

const router = express.Router();

const VALID_STATUSES   = ['new','assigned','in_progress','pending_escalation','escalated','resolved','closed'];
const VALID_PRIORITIES = ['P1','P2','P3'];
const VALID_LANGUAGES  = ['en','hi','ta','te','bn','mr','gu','kn','ml','pa'];

function san(str, max = 1000) {
  return typeof str === 'string' ? str.trim().slice(0, max) : '';
}

function ticketId() {
  return 'CMP-' + uuidv4().slice(0, 8).toUpperCase();
}

// Attach computed slaStatus to a complaint row
function withSLA(c) {
  return { ...c, slaStatus: getSLAStatus(c) };
}

// Distance formula (Haversine)
function getDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const R = 6371e3; // metres
  const f1 = lat1 * Math.PI/180, f2 = lat2 * Math.PI/180;
  const df = (lat2-lat1) * Math.PI/180, dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(df/2) * Math.sin(df/2) + Math.cos(f1) * Math.cos(f2) * Math.sin(dl/2) * Math.sin(dl/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── POST /analyze — AI categorization ──────────────────────────────────────────
router.post('/analyze', authMiddleware, async (req, res, next) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: 'Description required' });
    const analysis = await classifyComplaint(description);
    
    if (analysis.isGibberish) {
      return res.status(422).json({ 
        error: analysis.error || 'Description is too short or unclear',
        isGibberish: true 
      });
    }
    
    res.json(analysis);
  } catch (err) { next(err); }
});

// ── GET / — list with filters & pagination ────────────────────────────────────
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { status, priority, department, search, page = 1, limit = 20 } = req.query;
    const safePage  = Math.max(1, parseInt(page,  10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset    = (safePage - 1) * safeLimit;

    const params  = [];
    const where   = [];
    let   p       = 1;

    // Role-based scoping
    if (req.user.role === 'citizen') {
      where.push(`c.user_id = $${p++}`); params.push(req.user.id);
    } else if (req.user.role === 'field_officer') {
      where.push(`(c.assigned_to = $${p++} OR c.department_id = $${p++})`);
      params.push(req.user.id, req.user.departmentId);
    } else if (req.user.role === 'dept_head') {
      where.push(`c.department_id = $${p++}`); params.push(req.user.departmentId);
    }

    if (status) {
      if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
      where.push(`c.status = $${p++}`); params.push(status);
    }
    if (priority) {
      if (!VALID_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });
      where.push(`c.priority = $${p++}`); params.push(priority);
    }
    if (department) {
      where.push(`c.department_id = $${p++}`); params.push(department);
    }
    if (search) {
      const s = san(search, 200);
      where.push(`(c.title ILIKE $${p} OR c.description ILIKE $${p} OR c.ticket_id ILIKE $${p})`);
      params.push(`%${s}%`); p++;
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [{ rows: complaints }, { rows: countRows }] = await Promise.all([
      query(`
        SELECT c.*, d.name AS department_name,
               u.name AS assigned_to_name
        FROM complaints c
        LEFT JOIN departments d ON d.id = c.department_id
        LEFT JOIN users u       ON u.id = c.assigned_to
        ${whereClause}
        ORDER BY c.priority ASC, c.created_at DESC
        LIMIT $${p} OFFSET $${p + 1}
      `, [...params, safeLimit, offset]),
      query(`SELECT COUNT(*) FROM complaints c ${whereClause}`, params),
    ]);

    const total = parseInt(countRows[0].count, 10);
    res.json({
      complaints: complaints.map(withSLA),
      total, page: safePage,
      pages: Math.ceil(total / safeLimit),
    });
  } catch (err) { next(err); }
});

// ── GET /track/public/:ticketId ──────────────────────────────────────────────
router.get('/track/public/:ticketId', rateLimit({ windowMs: 15 * 60000, max: 20 }), async (req, res, next) => {
  try {
    const tid = req.params.ticketId.toUpperCase();
    const { rows: complaints } = await query(`
      SELECT c.id, c.ticket_id, c.status, c.priority, c.category, c.location, 
             c.created_at, c.resolved_at, c.resolved_media_urls,
             c.rating, c.rated_at,
             c.is_appealed, c.appealed_at,
             d.name as department_name
      FROM complaints c
      LEFT JOIN departments d ON d.id = c.department_id
      WHERE c.ticket_id = $1
    `, [tid]);

    if (!complaints.length) return res.status(404).json({ error: 'Complaint not found' });
    const complaint = complaints[0];

    const { rows: history } = await query(`
      SELECT status, created_at, note 
      FROM complaint_history 
      WHERE complaint_id = $1 
      ORDER BY created_at ASC
    `, [complaint.id]);

    res.json({ ...withSLA(complaint), history });
  } catch (err) { next(err); }
});

// ── GET /:id ──────────────────────────────────────────────────────────────────
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT c.*,
             d.name  AS department_name,
             u.name  AS assigned_to_name,
             ou.name AS officer_name
      FROM complaints c
      LEFT JOIN departments d ON d.id = c.department_id
      LEFT JOIN users u       ON u.id = c.user_id
      LEFT JOIN users ou      ON ou.id = c.assigned_to
      WHERE c.id = $1
    `, [req.params.id]);

    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const complaint = rows[0];

    if (req.user.role === 'citizen' && complaint.user_id !== req.user.id)
      return res.status(403).json({ error: 'Forbidden' });

    // Fetch history + comments in parallel
    const [{ rows: history }, { rows: comments }] = await Promise.all([
      query(`SELECT * FROM complaint_history WHERE complaint_id = $1 ORDER BY created_at ASC`, [complaint.id]),
      query(`SELECT * FROM complaint_comments WHERE complaint_id = $1 ORDER BY created_at ASC`, [complaint.id]),
    ]);

    res.json(withSLA({ ...complaint, history, comments }));
  } catch (err) { next(err); }
});

// ── POST / — create ───────────────────────────────────────────────────────────
router.post('/', authMiddleware, upload.array('media', 4), async (req, res, next) => {
  try {
    let { title, description, location, lat, lng, category, priority = 'P2', language = 'en' } = req.body;
    title       = san(title, 200);
    description = san(description, 5000);
    location    = san(location, 300);

    if (title.length < 3)        return res.status(400).json({ error: 'Title must be at least 3 characters' });
    if (description.length < 10) return res.status(400).json({ error: 'Description must be at least 10 characters' });
    if (!VALID_PRIORITIES.includes(priority)) priority = 'P2';
    if (!VALID_LANGUAGES.includes(language))  language  = 'en';

    let mediaUrls = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(f => uploadMedia(f.buffer, f.originalname, f.mimetype));
      mediaUrls = await Promise.all(uploadPromises);
    }

    const classification = await classifyComplaint(description);
    
    if (classification.isGibberish) {
      return res.status(422).json({ 
        error: classification.error || 'Description is too short or unclear. Please provide more details.',
        isGibberish: true 
      });
    }

    const topCat         = classification.categories[0];
    const finalPriority  = classification.isUrgent ? 'P1' : priority;
    const cat            = category || topCat?.department || 'General';
    const deptId         = DEPT_TO_ID[topCat?.department] || null;
    const slaDeadline    = getSLADeadline(finalPriority);
    const tid            = ticketId();

    // Store translation and summary if provided by AI
    const aiSummary = classification.summary || '';
    const aiTranslation = classification.translatedDescription || '';

    // ── Geospatial Duplicate Detection (100m radius) ─────────────────────────
    // Run BEFORE the INSERT — if a duplicate is found, reject the request entirely.
    if (lat && lng) {
      const { rows: potentialDups } = await query(`
        SELECT id, parent_id, ticket_id, title, description, lat, lng FROM complaints
        WHERE category = $1
          AND status IN ('new','assigned','in_progress','escalated')
          AND created_at > NOW() - INTERVAL '7 days'
      `, [cat]);

      // Only check complaints within 100 metres
      const nearby = potentialDups.filter(d => getDistance(parseFloat(lat), parseFloat(lng), d.lat, d.lng) < 100);

      if (nearby.length > 0) {
        const matchedId = await detectDuplicates({ title, description: aiTranslation || description }, nearby);

        if (matchedId) {
          const match   = nearby.find(d => d.id === matchedId);
          const parentId = match.parent_id || match.id;

          // Increment duplicate_count on the original complaint
          const { rows: updatedParent } = await query(`
            UPDATE complaints
            SET duplicate_count = duplicate_count + 1
            WHERE id = $1
            RETURNING ticket_id, duplicate_count, priority
          `, [parentId]);

          // Auto-escalate to P1 when 3+ people report the same issue
          const pdc = updatedParent[0];
          if (pdc && pdc.duplicate_count >= 2 && pdc.priority !== 'P1') {
            await query(`UPDATE complaints SET priority = 'P1' WHERE id = $1`, [parentId]);
            await addStatusHistory(parentId, 'escalated', 'system',
              'Auto-escalated to P1 due to multiple duplicate reports within 100 m.');
          }

          // Reject — DO NOT save to DB
          return res.status(409).json({
            error: 'A similar complaint has already been filed for this location.',
            isDuplicate: true,
            existingTicketId: pdc?.ticket_id || match.ticket_id,
          });
        }
      }
    }

    // ── No duplicate found — proceed with INSERT ─────────────────────────────
    const { rows } = await query(`
      INSERT INTO complaints
        (ticket_id, user_id, citizen_name, title, description, location, lat, lng,
         category, department_id, priority, status, language, ai_classification, sla_deadline, media_urls, ai_summary, translated_description)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'new',$12,$13,$14,$15,$16,$17)
      RETURNING *
    `, [tid, req.user.id, req.user.name, title, description, location,
        lat ? parseFloat(lat) : null, lng ? parseFloat(lng) : null,
        cat, deptId, finalPriority, language,
        JSON.stringify(classification), slaDeadline, JSON.stringify(mediaUrls), aiSummary, aiTranslation]);

    const complaint = rows[0];

    await addStatusHistory(complaint.id, 'new', req.user.id, 'Complaint submitted');
    await notifyComplaintCreated(complaint);

    // Smart auto-assign (non-blocking — complaint is already saved)
    setImmediate(async () => {
      try {
        const officer = await autoAssignOfficer(complaint.id, deptId, finalPriority, location);
        if (officer) {
          await notifyAssigned(complaint.id, tid, officer.id, complaint.user_id);
        }
      } catch (e) {
        console.error('[AutoAssign] Post-create error:', e.message);
      }
    });

    const { rows: [fresh] } = await query(`SELECT * FROM complaints WHERE id = $1`, [complaint.id]);
    res.status(201).json(withSLA(fresh));
  } catch (err) { next(err); }
});

// ── PUT /:id/status ───────────────────────────────────────────────────────────
router.put('/:id/status', authMiddleware, upload.array('media', 5), auditLog('complaint:status_change'), async (req, res, next) => {
  try {
    let { status, note } = req.body;
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    note = san(note || '', 500);

    const { rows } = await query(`SELECT * FROM complaints WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const c = rows[0];

    if (req.user.role === 'citizen') return res.status(403).json({ error: 'Forbidden' });
    if (req.user.role === 'field_officer' && c.assigned_to !== req.user.id)
      return res.status(403).json({ error: 'Not assigned to you' });
    if (c.status === 'closed' && !['super_admin','collector'].includes(req.user.role))
      return res.status(400).json({ error: 'Closed complaints cannot be re-opened' });

    const extra = {};
    if (status === 'resolved') {
      extra.resolved_at = new Date();
      if (req.files && req.files.length > 0) {
        const uploadPromises = req.files.map(f => uploadMedia(f.buffer, f.originalname, f.mimetype));
        const urls = await Promise.all(uploadPromises);
        extra.resolved_media_urls = JSON.stringify(urls);
      }
    }
    if (status === 'escalated') extra.escalated_at = new Date();

    const setClauses = Object.keys(extra).map((k, i) => `${k} = $${i + 3}`).join(', ');
    const extraVals  = Object.values(extra);

    const { rows: [updated] } = await query(`
      UPDATE complaints
        SET status = $1, updated_at = NOW() ${setClauses ? ', ' + setClauses : ''}
      WHERE id = $2
      RETURNING *
    `, [status, c.id, ...extraVals]);

    await addStatusHistory(c.id, status, req.user.id, note);

    // If resolved/closed, decrement officer load
    if (['resolved', 'closed'].includes(status) && c.assigned_to) {
      await decrementOfficerLoad(c.assigned_to);
    }

    await notifyStatusChange(updated, status);
    res.json(withSLA(updated));
  } catch (err) { next(err); }
});

// ── PUT /:id/assign ───────────────────────────────────────────────────────────
router.put('/:id/assign', authMiddleware, requireRole('dept_head','collector','super_admin'), auditLog('complaint:assign'), async (req, res, next) => {
  try {
    const { officerId } = req.body;
    if (!officerId) return res.status(400).json({ error: 'officerId required' });

    const [{ rows: [complaint] }, { rows: [officer] }] = await Promise.all([
      query(`SELECT * FROM complaints WHERE id = $1`, [req.params.id]),
      query(`SELECT * FROM users WHERE id = $1`, [officerId]),
    ]);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    if (!officer)   return res.status(404).json({ error: 'Officer not found' });

    // Decrement old officer's load, increment new officer's
    if (complaint.assigned_to && complaint.assigned_to !== officerId) {
      await decrementOfficerLoad(complaint.assigned_to);
    }
    // Only increment new officer load if complaint is still active
    if (!['resolved', 'closed'].includes(complaint.status)) {
      await query(`
        INSERT INTO officer_load (officer_id, active_count, last_assigned)
        VALUES ($1, 1, NOW())
        ON CONFLICT (officer_id) DO UPDATE
          SET active_count = officer_load.active_count + 1, last_assigned = NOW()
      `, [officerId]);
    }

    const { rows: [updated] } = await query(`
      UPDATE complaints 
      SET assigned_to = $1, department_id = $2, status = 'assigned', updated_at = NOW()
      WHERE id = $3 RETURNING *
    `, [officerId, officer.department_id, complaint.id]);

    await addStatusHistory(complaint.id, 'assigned', req.user.id, `Manually assigned to ${officer.name}`);
    await notifyAssigned(complaint.id, complaint.ticket_id, officerId, complaint.user_id);
    res.json(withSLA(updated));
  } catch (err) { next(err); }
});

// ── POST /:id/comments ────────────────────────────────────────────────────────
router.post('/:id/comments', authMiddleware, async (req, res, next) => {
  try {
    const text = san(req.body.text || '', 2000);
    if (!text) return res.status(400).json({ error: 'Comment text required' });

    const { rows: [c] } = await query(`SELECT user_id FROM complaints WHERE id = $1`, [req.params.id]);
    if (!c) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'citizen' && c.user_id !== req.user.id)
      return res.status(403).json({ error: 'Forbidden' });

    const { rows: [comment] } = await query(`
      INSERT INTO complaint_comments (complaint_id, user_id, user_name, role, text)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [req.params.id, req.user.id, req.user.name, req.user.role, text]);

    res.status(201).json(comment);
  } catch (err) { next(err); }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, requireRole('super_admin'), auditLog('complaint:delete'), async (req, res, next) => {
  try {
    const { rows: [c] } = await query(`SELECT assigned_to FROM complaints WHERE id = $1`, [req.params.id]);
    if (!c) return res.status(404).json({ error: 'Not found' });
    if (c.assigned_to) await decrementOfficerLoad(c.assigned_to);
    await query(`DELETE FROM complaints WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── GET /:id/summary (on-demand AI) ──────────────────────────────────────────
router.get('/:id/summary', authMiddleware, requireRole('field_officer','dept_head','collector','super_admin'), async (req, res, next) => {
  try {
    const { rows: [c] } = await query(`SELECT * FROM complaints WHERE id = $1`, [req.params.id]);
    if (!c) return res.status(404).json({ error: 'Not found' });
    const { generateSummary } = require('../services/aiService');
    const summary = await generateSummary(c);
    res.json({ summary });
  } catch (err) { next(err); }
});

// ── POST /:id/rate (F1: Citizen rating) ──────────────────────────────────────
// Only the complaint owner can rate, only once, only when resolved/closed.
router.post('/:id/rate', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const rating   = parseInt(req.body.rating, 10);
    const feedback = san(req.body.feedback || '', 500);

    // Validate rating value
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Fetch the complaint
    const { rows: [complaint] } = await query(
      `SELECT id, user_id, status, rating FROM complaints WHERE id = $1`,
      [id]
    );
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    // Guard: only the citizen who filed it can rate
    if (complaint.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the complaint owner can submit a rating' });
    }

    // Guard: only resolved or closed complaints can be rated
    if (!['resolved', 'closed'].includes(complaint.status)) {
      return res.status(400).json({ error: 'You can only rate resolved or closed complaints' });
    }

    // Guard: only rate once
    if (complaint.rating) {
      return res.status(409).json({ error: 'You have already rated this complaint' });
    }

    // Save the rating
    const { rows: [updated] } = await query(
      `UPDATE complaints
       SET rating = $1, rating_feedback = $2, rated_at = NOW(), updated_at = NOW()
       WHERE id = $3
       RETURNING id, rating, rating_feedback, rated_at`,
      [rating, feedback, id]
    );

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// ── POST /:id/appeal (F3: Citizen appeal flow) ────────────────────────────────
// Citizen can appeal a resolved/closed complaint once. Auto-escalates to P1.
router.post('/:id/appeal', authMiddleware, async (req, res, next) => {
  try {
    const { id }  = req.params;
    const reason  = san(req.body.reason || '', 1000);

    if (!reason) {
      return res.status(400).json({ error: 'A reason for appeal is required' });
    }

    const { rows: [complaint] } = await query(
      `SELECT id, user_id, status, is_appealed FROM complaints WHERE id = $1`,
      [id]
    );
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    // Only the complaint owner can appeal
    if (complaint.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the complaint owner can file an appeal' });
    }

    // Only resolved/closed complaints can be appealed
    if (!['resolved', 'closed'].includes(complaint.status)) {
      return res.status(400).json({ error: 'You can only appeal a resolved or closed complaint' });
    }

    // Only one appeal allowed
    if (complaint.is_appealed) {
      return res.status(409).json({ error: 'You have already filed an appeal for this complaint' });
    }

    const newSlaDeadline = getSLADeadline('P1');

    // Re-escalate: set status → escalated, priority → P1, record appeal, and refresh SLA
    await query(
      `UPDATE complaints
       SET status      = 'escalated',
           priority    = 'P1',
           is_appealed = TRUE,
           appeal_reason = $1,
           appealed_at   = NOW(),
           sla_deadline  = $3,
           updated_at    = NOW()
       WHERE id = $2`,
      [reason, id, newSlaDeadline]
    );

    // Log to history so officers can see the appeal in the timeline
    await addStatusHistory(id, 'escalated', req.user.id, `APPEAL: ${reason}`);

    res.json({ success: true, message: 'Appeal submitted. Your complaint has been escalated to P1.' });
  } catch (err) { next(err); }
});

module.exports = router;
