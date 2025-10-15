const { isAdminUser } = require('../controllers/auth.controller');

exports.requireAdmin = (req, res, next) => {
  const user = req.session?.user;

  if (isAdminUser(user)) {
    return next();
  }

  const wantsJSON =
    req.xhr ||
    (req.headers.accept || '').includes('application/json') ||
    req.originalUrl.includes('/api');

  if (wantsJSON) {
    return res.status(403).json({ ok: false, message: 'Accès administrateur requis' });
  }
  return res.redirect('/login');
};