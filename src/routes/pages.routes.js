const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs');

//routes publiques
router.get('/', (req, res) => {
  const u = req.session.user;
  if (!u) return res.redirect('/login');
  const admin = u.isAdmin || u.role === 'ADMIN';
  return res.redirect(admin ? '/admin' : '/accueil');
});

router.get('/inscription', (req, res) => {
  res.render('inscription');
});

router.get('/login', (req, res) => {
  const accountDeleted = req.query.account_deleted === '1';
  res.render('login', { accountDeleted });
})


module.exports = router;

//routes protégées
const { requirePage, requireApi } = require('../middlewares/requireAuth');
const cart = require('../models/cart');

router.get('/accueil', requirePage, async (req, res, next) => {
  try {
    const rows = await prisma.concert.findMany({
      orderBy: { date: 'asc' },
      select: { id: true, ville: true, date: true, lieu: true }
    });

    const fmt = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short', day: '2-digit', month: 'long',
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'UTC'
    });

    const concerts = rows.map(c => ({
      ...c,
      dateLabel: fmt.format(new Date(c.date))
    }));

    res.render('accueil', { concerts, page: 'accueil', title: 'Accueil' });
  } catch (e) {
    next(e);
  }
});
function formatDateHeureFR(iso) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    timeZone: 'UTC'
  });
  const time = d.toLocaleTimeString('fr-FR', {
    timeZone: 'UTC',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).replace(':', 'h');
  return `${date} - ${time}`;
}

function slugVille(v) {
  return String(v || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // suppr. accents
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')        // non alnum -> -
    .replace(/^-+|-+$/g, '');
}

router.get('/billeterie', requirePage, async (req, res, next) => {
  try {
    const rows = await prisma.concert.findMany({
      orderBy: [{ date: 'asc' }],
      select: { id:true, ville:true, date:true, lieu:true, prixDebout:true, prixAssis:true, placesDispo:true }
    });

    const assetsDir = path.join(process.cwd(), 'public', 'assets');
    const enriched = rows.map(c => {
      const slug = slugVille(c.ville);
      const candidates = [
        path.join(assetsDir, `${slug}.jpg`),
        path.join(assetsDir, `${slug}.jpeg`),
        path.join(assetsDir, `${slug}.png`),
        path.join(assetsDir, `${slug}.webp`),
      ];
      const found = candidates.find(p => fs.existsSync(p));
      return {
        ...c,
        slug,
        image: found ? `/public/assets/${path.basename(found)}` : '/public/assets/default.jpg',
        dateLabel: formatDateHeureFR(c.date)
      };
    });

    res.render('billeterie', { concerts: enriched, page: 'billeterie', title: 'Billetterie' });
  } catch (e) { next(e); }
});

//route de déconnexion

router.get('/logout', (req, res) => {
  const userId = req.session.user?.id;

  req.session.destroy(async (err) => {
    if (err) {
      return res.status(500).json({ message: "Erreur lors de la déconnexion"});
    }

    await cart.deleteOne({ userId });

    res.clearCookie('connect.sid');
    res.redirect('/?logout=1');
  });
});