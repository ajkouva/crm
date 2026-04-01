const limitMap = new Map();

/**
 * Simple in-memory rate limiter middleware.
 * @param {Object} options 
 * @param {number} options.windowMs Window in milliseconds (default: 1 minute)
 * @param {number} options.max Max requests per window (default: 300)
 * @param {string} options.message Error message
 */
function rateLimit({ windowMs = 60000, max = 300, message = 'Too many requests' } = {}) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const e   = limitMap.get(key) || { count: 0, resetAt: now + windowMs };
    
    if (now > e.resetAt) {
      e.count = 0;
      e.resetAt = now + windowMs;
    }
    
    e.count++;
    limitMap.set(key, e);
    
    if (e.count > max) {
      return res.status(429).json({ error: message });
    }
    
    next();
  };
}

module.exports = { rateLimit };

// Cleanup old entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of limitMap.entries()) {
    if (now > data.resetAt) {
      limitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);
