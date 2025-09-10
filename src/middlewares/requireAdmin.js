exports.requireAdmin = (req, res, next) => {
  const u = req.session?.user;
  const isAdmin = u && (u.isAdmin || u.role === 'ADMIN');

  if (isAdmin) return next();

  // détecter si la requête attend du JSON
  const wantsJSON =
    req.xhr ||
    (req.headers.accept || '').includes('application/json') ||
    req.originalUrl.includes('/api');

  if (wantsJSON) {
    return res.status(403).json({ ok:false, message:'Accès administrateur requis' });
  }
  return res.redirect('/login');
};