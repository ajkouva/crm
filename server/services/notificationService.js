const { query } = require('../models/db');

let io = null;
function setSocketIO(socketIO) { io = socketIO; }

async function createNotification(userId, type, message, complaintId = null) {
  try {
    const { rows } = await query(`
      INSERT INTO notifications (user_id, type, message, complaint_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [userId, type, message, complaintId || null]);

    const notif = rows[0];
    if (io) io.to(`user:${userId}`).emit('notification', notif);
    return notif;
  } catch (err) {
    console.error('[Notification] Failed to create:', err.message);
  }
}

async function notifyAdmins(type, message, complaintId) {
  try {
    const { rows } = await query(`SELECT id FROM users WHERE role IN ('super_admin', 'collector') AND active = TRUE`);
    for (const u of rows) {
      await createNotification(u.id, type, message, complaintId);
    }
  } catch (err) {
    console.error('[Notification] Failed to notify admins:', err.message);
  }
}

async function notifyComplaintCreated(complaint) {
  const slaText = { P1: '24 hours', P2: '72 hours', P3: '7 days' }[complaint.priority] || '72 hours';
  
  // Notify Citizen
  await createNotification(
    complaint.user_id,
    'created',
    `Your complaint #${complaint.ticket_id} has been registered. We'll respond within ${slaText}.`,
    complaint.id
  );

  // Notify Admins
  await notifyAdmins('alert', `New ${complaint.priority || ''} complaint #${complaint.ticket_id} submitted by a citizen.`, complaint.id);
}

async function notifyAssigned(complaintId, ticketId, officerId, citizenId) {
  await createNotification(
    officerId, 'assigned',
    `Complaint #${ticketId} has been assigned to you.`,
    complaintId
  );
  await createNotification(
    citizenId, 'update',
    `Your complaint #${ticketId} has been assigned to an officer and is being reviewed.`,
    complaintId
  );
}

async function notifyStatusChange(complaint, newStatus) {
  const messages = {
    in_progress: `Your complaint #${complaint.ticket_id} is now being worked on.`,
    resolved:    `Great news! Your complaint #${complaint.ticket_id} has been resolved.`,
    closed:      `Your complaint #${complaint.ticket_id} has been closed.`,
    escalated:   `Your complaint #${complaint.ticket_id} has been escalated for urgent attention.`,
  };
  if (messages[newStatus]) {
    await createNotification(complaint.user_id, newStatus, messages[newStatus], complaint.id);
  }

  if (newStatus === 'escalated') {
    await notifyAdmins('alert', `Complaint #${complaint.ticket_id} has been ESCALATED.`, complaint.id);
  } else if (newStatus === 'resolved' || newStatus === 'closed') {
    await notifyAdmins('update', `Complaint #${complaint.ticket_id} has been marked as ${newStatus}.`, complaint.id);
  }
}

async function notifySlaBreach(complaint) {
  await createNotification(
    complaint.assigned_to || complaint.user_id, 'alert',
    `⚠ URGENT: SLA has breached for Complaint #${complaint.ticket_id} (${complaint.title}). Immediate action required.`,
    complaint.id
  );
}

module.exports = { setSocketIO, createNotification, notifyComplaintCreated, notifyAssigned, notifyStatusChange, notifySlaBreach };
