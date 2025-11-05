const { isAdminUser } = require('../controllers/auth.controller');

exports.requireAdmin = (req, res, next) => {
  const user = req.session?.user;

  if (isAdminUser(user)) {
    return next();
  }

  const accepts = require('accepts');
  const wantsJSON = accepts(req).types(['json', 'html']) === 'json';

  if (wantsJSON) {
    return res.status(403).json({ ok: false, message: 'Accès administrateur requis' });
  }
  return res.redirect('/login');
};