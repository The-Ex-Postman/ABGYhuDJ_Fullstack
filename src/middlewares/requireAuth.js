exports.requirePage = (req, res, next) => {
  if (req.session?.user) return next();
  return res.redirect('/?expired=true');
};

exports.requireApi = (req, res, next) => {
  if (req.session?.user) return next();
  return res.status(401).json({ ok:false, message: 'Non connecté' });
};