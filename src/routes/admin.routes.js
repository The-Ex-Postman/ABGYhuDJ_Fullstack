const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { z } = require('zod');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { requireAdmin } = require('../middlewares/requireAdmin');
const { validate } = require('../middlewares/validate');
const { create } = require('../models/log');


function slugVille(v) {
  return String(v || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const ASSETS_DIR = path.join(process.cwd(), 'public', 'assets');
fs.mkdirSync(ASSETS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ASSETS_DIR),
  filename: (req, file, cb) => {
    const base = slugVille(req.body?.ville) || 'ville';
    const extFromName = (path.extname(file.originalname) || '.jpg').toLowerCase();
    const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp']);
    const ext = allowed.has(extFromName) ? extFromName : '.jpg';
    cb(null, `${base}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpe?g|webp)$/i.test(file.mimetype)) return cb(null, true);
    return cb(null, false);
  },
  limits: { fileSize: 3 * 1024 * 1024 }
});

const toIntOrDefault = (def = 0) =>
  z.preprocess(v => {
    if (v === undefined || v === null || v === '') return def;
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  }, z.number().int().nonnegative());

const toNumOptional = z.preprocess(v => {
  if (v === undefined || v === null || v === '') return undefined; 
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;                       
}, z.number().nonnegative().optional());

router.use('/admin', requireAdmin);

// Page board
router.get('/admin', requireAdmin, async (req, res, next) => {
  try {
    const rows = await prisma.concert.findMany({
      orderBy: [{ date: 'asc' }, { ville: 'asc' }],
      select: { id:true, ville:true, lieu:true, placesDispo:true, date:true }
    });

    const tz = process.env.TZ || 'Europe/Paris';
    const fD = new Intl.DateTimeFormat('fr-FR', {
      timeZone: tz,
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
    const fT = new Intl.DateTimeFormat('fr-FR', {
      timeZone: tz,
      hour: '2-digit', minute: '2-digit', hour12: false
    });

    const concerts = rows.map(c => ({
      ...c,
      dateLabel: `${fD.format(c.date)} - ${fT.format(c.date).replace(':', 'h')}`
    }));

    res.render('admin-board', {
      concerts,
      page:'admin',
      title:'Admin Board',
      created: req.query.created,
      error: req.query.error
    });
  } catch (e) { next(e); }
});

// API: liste des concerts
router.get('/admin/api/concerts', requireAdmin, async (req, res, next) => {
  try {
    const concerts = await prisma.concert.findMany({
      orderBy: { ville: 'asc' },
      select: { id:true, ville:true, lieu:true, placesDispo:true, date:true }
    });
    res.json({ ok:true, concerts });
  } catch (e) { next(e); }
});

// API: détail d’un concert
router.get('/admin/api/concerts/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const c = await prisma.concert.findUnique({
      where: { id },
      select: { id:true, ville:true, lieu:true, placesDispo:true, date:true }
    });
    if (!c) return res.status(404).json({ ok:false, message:'Concert introuvable' });
    res.json({ ok:true, concert: c });
  } catch (e) { next(e); }
});

const updateStockSchema = z.object({
  body: z.object({
    placesDispo: z.preprocess(v => Number(v), z.number().int().nonnegative())
  }),
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  query:  z.object({}).passthrough()
});

// API: mise à jour du stock
router.patch('/admin/api/concerts/:id/stock',
  requireAdmin,
  validate(updateStockSchema),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const { placesDispo } = req.body;

      const updated = await prisma.concert.update({
        where: { id },
        data: { placesDispo }
      });

      res.json({ ok:true, concert: {
        id: updated.id, ville: updated.ville, placesDispo: updated.placesDispo
      }});
    } catch (e) { next(e); }
  }
);

// Ajout d'un concert
const addConcertSchema = z.object({
  body: z.object({
    ville: z.string().min(1),
    date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/), 
    heure: z.string().regex(/^\d{2}:\d{2}$/),       
    lieu:  z.string().min(1),
    placesDispo: toIntOrDefault(0),                
    prixDebout:  toNumOptional,                    
    prixAssis:   toNumOptional
  }),
  params: z.object({}).passthrough(),
  query:  z.object({}).passthrough()
});

router.post('/admin/api/concerts',
  upload.single('image'),
  validate(addConcertSchema),
  async (req, res) => {
    try {
      const { ville, date, heure, lieu, placesDispo = 0, prixDebout, prixAssis } = req.body;

      const wantsJson = (req.headers.accept || '').includes('application/json');

      const [Y,M,D] = date.split('-').map(Number);
      const [h,m]   = heure.split(':').map(Number);
      const dtISO   = new Date(Date.UTC(Y, M-1, D, h, m, 0, 0));
      if (Number.isNaN(dtISO.getTime())) {
        return wantsJson
          ? res.status(400).json({ ok:false, message:'Date/heure invalides' })
          : res.redirect(303, '/admin?error=Date/heure invalides');
      }

      const v = String(ville).trim();
      const l = String(lieu).trim();

      const exists = await prisma.concert.findFirst({ where: { ville: v, lieu: l, date: dtISO }, select: { id:true } });
      if (exists) {
        return wantsJson
          ? res.status(409).json({ ok:false, message:'Un concert existe déjà à ce lieu et cette date' })
          : res.redirect(303, '/admin?error=Doublon');
      }

      const created = await prisma.concert.create({
        data: {
          ville: v,
          date: dtISO,
          lieu: l,
          placesDispo: Number(placesDispo),
          prixDebout: (prixDebout !== undefined && prixDebout !== '') ? Number(prixDebout) : null,
          prixAssis:  (prixAssis  !== undefined && prixAssis  !== '') ? Number(prixAssis)  : null
        }
      });

      return wantsJson
        ? res.status(201).json({ ok:true, id: created.id })
        : res.redirect(303, '/admin?created=1');

    } catch (e) {
      console.error('[admin:create] ERROR:', { code:e.code, message:e.message });
      const wantsJson = (req.headers.accept || '').includes('application/json');
      if (e.code === 'P2002') {
        return wantsJson
          ? res.status(409).json({ ok:false, message:'Un concert existe déjà à ce lieu et cette date' })
          : res.redirect(303, '/admin?error=Doublon');
      }
      return wantsJson
        ? res.status(500).json({ ok:false, message:'Erreur serveur création concert' })
        : res.redirect(303, '/admin?error=Erreur+serveur');
    }
  }
);

module.exports = router;