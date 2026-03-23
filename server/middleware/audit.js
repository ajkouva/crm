const { query } = require('../models/db');

function auditLog(action) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      if (res.statusCode < 400) {
        query(
          `INSERT INTO audit_logs (action, user_id, user_role, details, ip) VALUES ($1,$2,$3,$4,$5)`,
          [action, req.user?.id || 'anonymous', req.user?.role, JSON.stringify({ body: req.body, params: req.params }), req.ip]
        ).catch(e => console.error('[Audit]', e.message));
      }
      return originalJson(data);
    };
    next();
  };
}

module.exports = { auditLog };
