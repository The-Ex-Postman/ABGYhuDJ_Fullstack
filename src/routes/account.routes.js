const express = require('express');
const router = express.Router();
const accountController = require('../controllers/account.controller');
const { requirePage, requireApi } = require('../middlewares/requireAuth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/mon-compte', requirePage, async (req, res, next) => {
  try {
    const userId = req.session.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    const commandes = await prisma.commande.findMany({
      where: { userId },
      orderBy: { dateCommande: 'desc' },
      include: { tickets: { include: { concert: true } } },
    });

    res.render('profile', {
      user,
      commandes,
      page: 'profile',
      title: 'Mon Profil',
      query: req.query,
    });
  } catch (e) {
    next(e);
  }
});

router.post('/mon-compte', requireApi, accountController.postProfile);

router.post('/delete-account', requireApi, accountController.deleteAccount);

module.exports = router;