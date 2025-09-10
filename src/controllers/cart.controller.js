const Cart = require('../models/cart');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


// GET /api/cart/get

exports.getCart = async (req, res) => {
  const userId = req.session.user.id;
  const cart = await Cart.findOne({ userId }).lean();
  const items = cart?.items || [];

  // métadonnées concerts (ville, image, date, lieu)
  const ids = [...new Set(items.map(i => Number(i.concertId)).filter(Boolean))];
  let meta = {};
  if (ids.length) {
    const rows = await prisma.concert.findMany({
      where: { id: { in: ids } },
      select: { id:true, ville:true, date:true, lieu:true }
    });
    meta = Object.fromEntries(
      rows.map(r => [r.id, {
        ville: r.ville,
        date: r.date,
        lieu: r.lieu,
        image: `/public/assets/${r.ville.toLowerCase()}.jpg`
      }])
    );
  }

  res.json({ ok: true, items, meta });
};

// * POST /api/cart/add

exports.addToCart = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [req.body];
    if (!rawItems.length) {
      return res.status(400).json({ ok:false, message:'Aucun item fourni' });
    }

    const items = [];
    for (const [idx, it] of rawItems.entries()) {
      const concertId = Number(it.concertId);
      const type = String(it.type || '').toLowerCase();
      const quantite = Number(it.quantite);
      const prixUnitaire = Number(it.prixUnitaire);

      if (!concertId || !Number.isFinite(concertId)) {
        return res.status(400).json({ ok:false, message:`concertId obligatoire (item #${idx})` });
      }
      if (!['debout','assis'].includes(type)) {
        return res.status(400).json({ ok:false, message:`type invalide (item #${idx})` });
      }
      if (!quantite || quantite < 1) {
        return res.status(400).json({ ok:false, message:`quantite invalide (item #${idx})` });
      }
      if (!Number.isFinite(prixUnitaire) || prixUnitaire < 0) {
        return res.status(400).json({ ok:false, message:`prixUnitaire invalide (item #${idx})` });
      }

      const exists = await prisma.concert.findUnique({ where: { id: concertId }, select: { id: true } });
      if (!exists) {
        return res.status(404).json({ ok:false, message:`Concert introuvable (item #${idx})` });
      }

      items.push({ concertId, type, quantite, prixUnitaire });
    }

    // ============================
    // 🔒 STOCK CHECK (placesDispo)
    // ============================

    const requestedByConcert = new Map();
    for (const it of items) {
      requestedByConcert.set(it.concertId, (requestedByConcert.get(it.concertId) || 0) + it.quantite);
    }

    const existingCart = await Cart.findOne({ userId });
    const existingByConcert = new Map();
    for (const it of (existingCart?.items || [])) {
      existingByConcert.set(it.concertId, (existingByConcert.get(it.concertId) || 0) + Number(it.quantite || 0));
    }

    const concertIds = [...requestedByConcert.keys()];
    const concerts = await prisma.concert.findMany({
      where: { id: { in: concertIds } },
      select: { id: true, ville: true, placesDispo: true }
    });
    const byId = new Map(concerts.map(c => [c.id, c]));

    for (const [cid, addQty] of requestedByConcert.entries()) {
      const concert = byId.get(cid);
      if (!concert) {
        return res.status(404).json({ ok:false, message:`Concert introuvable (${cid})` });
      }
      const deja = existingByConcert.get(cid) || 0;
      const dispo = Number(concert.placesDispo || 0);
      const reste = dispo - deja;

      if (reste <= 0) {
        return res.status(400).json({ ok:false, message:`Complet : ${concert.ville}` });
      }
      if (addQty > reste) {
        return res.status(400).json({ ok:false, message:`Seulement ${reste} place(s) restante(s) pour ${concert.ville}` });
      }
    }

    // =================================
    // ✅ Upsert panier + merge
    // =================================
    const cart = existingCart || new Cart({ userId, items: [] });

    for (const it of items) {
      const i = cart.items.findIndex(x => x.concertId === it.concertId && x.type === it.type);
      if (i >= 0) {
        cart.items[i].quantite += it.quantite;
        cart.items[i].prixUnitaire = it.prixUnitaire;
      } else {
        cart.items.push(it);
      }
    }

    await cart.save();
    return res.json({ ok:true, items: cart.items });

  } catch (err) {
    console.error('[Cart:add] error:', err);
    return res.status(500).json({ ok:false, message:'Erreur serveur (add cart)' });
  }
};

/**
 * POST /api/cart/clear
 * Vide le panier de l’utilisateur courant
 */
exports.clearCart = async (req, res) => {
  try {
    const userId = req.session.user.id;
    await Cart.deleteOne({ userId });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[Cart:clear] error:', err);
    return res.status(500).json({ ok: false, message: 'Erreur serveur (clear cart)' });
  }
};