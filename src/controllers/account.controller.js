const prisma = require('../config/prisma');

const isEmail = (s='') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim().toLowerCase());
const isPhoneFR = (s='') => /^(\+33|0)[1-9](\d{2}){4}$/.test(String(s).replace(/\s+/g,''));
const clamp = (s, n) => (s && s.length > n ? s.slice(0, n) : s);

const emptyToNull = (v) => {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
};

exports.getProfile = async (req, res, next) => {
  try {
    const id = Number(req.session?.user?.id);
    if (!id) return res.redirect('/login');

    const user = await prisma.user.findUnique({ where: { id } });

    return res.render('profile', {
      user,
      historique: [],
      page: 'profile',
      title: 'Mon compte',
    });
  } catch (err) {
    next(err);
  }
};

exports.postProfile = async (req, res, next) => {
  try {
    const id = Number(req.session?.user?.id);
    if (!id) return res.redirect('/login');

    const email = req.body.email ? req.body.email.trim().toLowerCase() : undefined;
    if (email !== undefined && !isEmail(email)) {
      const user = await prisma.user.findUnique({ where: { id } });
      return res.status(400).render('profile', {
        user, historique: [], page:'profile', title:'Mon compte',
        errorEmail: "Adresse e-mail invalide."
      });
    }

    const tel = emptyToNull(req.body.tel);
    if (tel && !isPhoneFR(tel)) {
      const user = await prisma.user.findUnique({ where: { id } });
      return res.status(400).render('profile', {
        user, historique: [], page:'profile', title:'Mon compte',
        errorTel: "Téléphone invalide (FR attendu)."
      });
    }

    const data = {
      prenom:  clamp(emptyToNull(req.body.prenom), 100),
      nom:     clamp(emptyToNull(req.body.nom), 100),
      email, 
      adresse: clamp(emptyToNull(req.body.adresse), 255),
      ville:   clamp(emptyToNull(req.body.ville), 100),
      tel
    };

    const updated = await prisma.user.update({ where: { id }, data });
    req.session.user = {
      id: updated.id,
      email: updated.email,
      role: updated.role,
    };

    req.session.save(err => {
      if (err) return next(err);
      return res.redirect(303, '/mon-compte'); 
    });
  } catch (err) {
    if (err.code === 'P2002' && err.meta?.target?.includes('email')) {
      const id = Number(req.session.user.id);
      const user = await prisma.user.findUnique({ where: { id } });
      return res.status(409).render('profile', {
        user,
        historique: [],
        page: 'profile',
        title: 'Mon compte',
        errorEmail: "Cet e-mail est déjà utilisé.",
      });
    }
    return next(err);
  }
};

exports.getPastOrders = async (req, res, next) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) return res.redirect('/login');

    const commandes = await prisma.commande.findMany({
      where: { userId },
      orderBy: { dateCommande: 'desc' },
      include: { tickets: { include: { concert: true } } }
    });

    res.render('mes-commandes', {
      commandes,
      page: 'mes-commandes',
      title: 'Mes commandes'
    });
  } catch (e) { next(e); }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    const id = Number(req.session?.user?.id);
    if (!id) return res.redirect('/login');

    if (req.session.user.role === 'ADMIN') return res.status(403).send('Forbidden');

    await prisma.$transaction([
      prisma.commande?.deleteMany ? prisma.commande.deleteMany({ where: { user: { id: id } } }) : Promise.resolve(),
      prisma.user.delete({ where: { id : id } }),
    ]);

    try { await Cart.deleteOne({ userId: id }); } catch (_) {}

    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('connect.sid');
      return res.redirect(303, '/login?account_deleted=1');
    });
  } catch (err) {
    return next(err);
  }
};