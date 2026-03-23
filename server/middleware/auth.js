const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ps-crm-secret';

const ROLES = {
  CITIZEN:      'citizen',
  FIELD_OFFICER:'field_officer',
  DEPT_HEAD:    'dept_head',
  COLLECTOR:    'collector',
  SUPER_ADMIN:  'super_admin',
};

const PERMISSIONS = {
  citizen:      ['complaint:create', 'complaint:read_own', 'notification:read_own'],
  field_officer:['complaint:read_dept', 'complaint:update_status', 'complaint:comment', 'notification:read_own'],
  dept_head:    ['complaint:read_dept', 'complaint:update_status', 'complaint:assign', 'complaint:comment', 'report:read_dept', 'notification:read_own'],
  collector:    ['complaint:read_all', 'complaint:update_status', 'complaint:assign', 'complaint:escalate', 'report:read_all', 'notification:read_own'],
  super_admin:  ['complaint:read_all', 'complaint:update_status', 'complaint:assign', 'complaint:escalate', 'complaint:delete', 'report:read_all', 'user:manage', 'notification:read_all'],
};

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    if (req.user.active === false && !['/api/auth/me', '/api/auth/logout'].includes(req.originalUrl)) {
      return res.status(403).json({ error: 'Account pending admin approval' });
    }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    const perms = PERMISSIONS[req.user.role] || [];
    if (!perms.includes(permission))
      return res.status(403).json({ error: `Permission denied: ${permission}` });
    next();
  };
}

module.exports = { authMiddleware, requireRole, requirePermission, ROLES, PERMISSIONS };
