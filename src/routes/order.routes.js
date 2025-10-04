const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query', 'error', 'warn'] });

const {requirePage, requireApi} = require('../middlewares/requireAuth');
const orderController = require('../controllers/order.controller');

router.get('/formulaire', requirePage, orderController.getFormulaire);

//check des infos utilisateur
router.get('/check-user-info', requireApi, async (req, res) => {
  const id = Number(req.session?.user?.id);
  if (!id) return res.status(401).json({ ok: false, message: 'Non connecté' });

  const user = await prisma.user.findUnique({ where: { id } });

  const champsObligatoires = ['prenom', 'nom', 'email', 'adresse', 'ville', 'tel'];
  const manquants = champsObligatoires.filter(champ => !user[champ]);

  if (manquants.length > 0) {
    return res.json({ ok: false, message: 'Veuillez compléter vos informations personnelles.' });
  }

  return res.json({ ok: true });
});

router.post('/api/checkout/confirm',
  (req,res,next) => { console.log('CT:', req.headers['content-type']); next(); },
  requireApi,
  orderController.confirmCheckout
);

module.exports = router;