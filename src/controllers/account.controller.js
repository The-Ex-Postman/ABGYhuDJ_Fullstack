const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const isEmail = (s='') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim().toLowerCase());
const isPhoneFR = (s='') => /^(\+33|0)[1-9](\d{2}){4}$/.test(String(s).replace(/\s+/g,''));
const clamp = (s, n) => (s && s.length > n ? s.slice(0, n) : s);

const emptyToNull = (v) => {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
};

// Exporter les infos de la table User vers la vue profile
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

// Mise à jour du profil utilisateur
exports.postProfile = async (req, res, next) => {
  try {
    const id = Number(req.session?.user?.id);
    if (!id) return res.redirect('/login');

    // normalisation + limites
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
    // rafraîchir la session pour que le reste du site ait les valeurs à jour
    req.session.user = {
      id: updated.id,
      email: updated.email,
      role: updated.role,
    };

    req.session.save(err => {
      if (err) return next(err);
      return res.redirect('/mon-compte'); 
    });
  } catch (err) {
    // Contrainte d’unicité email
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

//historique
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

// Suppression du compte utilisateur
exports.deleteAccount = async (req, res, next) => {
  try {
    const id = Number(req.session?.user?.id);
    if (!id) return res.redirect('/login');

    // On empêche qu’un admin se supprime lui-même
    if (req.session.user.role === 'ADMIN') return res.status(403).send('Forbidden');

    // Supprimer les données liées AVANT l’utilisateur
    await prisma.$transaction([
      prisma.commande?.deleteMany ? prisma.commande.deleteMany({ where: { userId: id } }) : Promise.resolve(),
      prisma.ticket?.deleteMany({ where: { userId: id } }), 
      prisma.user.delete({ where: { id } }),
    ]);

    // Purge du panier Mongo
    try { await Cart.deleteOne({ userId: id }); } catch (_) {}

    // Fin de session + redirection
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('connect.sid');
      return res.redirect('/login?account_deleted=1');
    });
  } catch (err) {
    return next(err);
  }
};