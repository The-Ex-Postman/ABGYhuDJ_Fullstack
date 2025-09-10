const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

    const data = {
      prenom:  emptyToNull(req.body.prenom),
      nom:     emptyToNull(req.body.nom),
      email:   req.body.email ? req.body.email.trim() : undefined,
      adresse: emptyToNull(req.body.adresse),
      ville:   emptyToNull(req.body.ville),
      tel:     emptyToNull(req.body.tel),
    };

    const updated = await prisma.user.update({ where: { id }, data });

    // rafraîchir la session pour que le reste du site ait les valeurs à jour
    req.session.user = {
      id: updated.id,
      email: updated.email,
      role: updated.role,
    };

    return res.redirect('/mon-compte');
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

exports.deleteAccount = async (req, res, next) => {
  try {
    const id = Number(req.session?.user?.id);
    if (!id) return res.redirect('/login');

    // 🔒 Sécurité minimale: on empêche qu’un admin se supprime lui-même si tu le souhaites
    if (req.session.user.role === 'ADMIN') return res.status(403).send('Forbidden');

    // 🧨 Supprimer les données liées AVANT l’utilisateur (si pas de cascade)
    // Adapte les deleteMany selon tes tables (tickets, commandes, etc.)
    await prisma.$transaction([
      prisma.commande?.deleteMany ? prisma.commande.deleteMany({ where: { userId: id } }) : Promise.resolve(),
      // prisma.ticket?.deleteMany({ where: { userId: id } }), // si tu as une table Ticket
      prisma.user.delete({ where: { id } }),
    ]);

    // 🧹 Purge du panier Mongo
    try { await Cart.deleteOne({ userId: id }); } catch (_) {}

    // 🔚 Fin de session + redirection
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('connect.sid');
      return res.redirect('/login?account_deleted=1');
    });
  } catch (err) {
    return next(err);
  }
};