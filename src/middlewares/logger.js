const Log = require('../models/log');

const SENSITIVE_KEYS = new Set(['password','confirm','token','card','cvv','numero-carte','date-exp','cardLast4','exp']);

function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k,v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(k)) { out[k] = '[redacted]'; continue; }
    out[k] = (v && typeof v === 'object') ? sanitize(v) : v;
  }
  return out;
}

module.exports = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      await Log.create({
        type: 'action',
        ip: req.ip,
        route: req.originalUrl,
        user_id: req.session?.user?.id || null,
        payload: {
          method: req.method,
          body: sanitize(req.body),
          query: sanitize(req.query),
        },
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('logger error:', err.message);
    }
  }
  next();
};