const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();const Cart = require('../models/cart');
const mailer = require('../config/mailer');

exports.getFormulaire = async (req, res, next) => {
  try {
    const id = Number(req.session?.user?.id);
    if (!id) return res.redirect('/login');

    const user = await prisma.user.findUnique({ where: { id } });

    return res.render('formulaire', {
      user,
      page: 'formulaire',
      title: 'Formulaire de commande',
    });
  } catch (err) {
    next(err);
  }
};

exports.confirmCheckout = async (req, res, next) => {
  try {
    const userId = Number(req.session?.user?.id);
    if (!userId) return res.status(401).json({ ok:false, message:'Non connecté' });

    // 1) User + infos obligatoires
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ ok:false, message:'Utilisateur introuvable' });

    const obligatoires = ['prenom','nom','email','adresse','ville','tel'];
    const manquants = obligatoires.filter(k => !user[k]);
    if (manquants.length) {
      return res.status(400).json({ ok:false, message:'Informations personnelles incomplètes' });
    }

    // 2) Panier
    const cartDoc = await Cart.findOne({ userId }).lean();
    const items = Array.isArray(cartDoc?.items) ? cartDoc.items : [];
    if (!items.length) {
      return res.status(400).json({ ok:false, message:'Panier vide' });
    }

    // 3) Recalcul serveur + préparation des lignes
    let totalCents = 0;
    const lignes = [];                      
    const decByConcert = new Map();         
    const villeByConcert = new Map();       

    for (const [idx, it] of items.entries()) {
      const concertId = Number(it.concertId);
      const quantite  = Number(it.quantite);
      const rawType   = String(it.type || '').toLowerCase();

      if (!concertId) throw new Error(`concertId manquant (item #${idx})`);
      if (!quantite || quantite < 1) throw new Error(`quantite invalide (item #${idx})`);
      if (!['debout','assis'].includes(rawType)) throw new Error(`type invalide (item #${idx})`);

      // prix depuis la DB (source de vérité)
      const concert = await prisma.concert.findUnique({
        where: { id: concertId },
        select: { ville:true, prixDebout:true, prixAssis:true }
      });
      if (!concert) throw new Error(`Concert introuvable (item #${idx})`);

      const unit = rawType === 'assis' ? Number(concert.prixAssis) : Number(concert.prixDebout);
      if (!Number.isFinite(unit) || unit < 0) throw new Error(`Prix invalide (item #${idx})`);

      const sousTotalCents = Math.round(unit * 100) * quantite;
      totalCents += sousTotalCents;

      const placeType = rawType === 'assis' ? 'ASSIS' : 'DEBOUT';
      lignes.push({
        concertId,
        type: placeType,
        quantite,
        prixUnitaire: unit,
        ville: concert.ville
      });

      decByConcert.set(concertId, (decByConcert.get(concertId) || 0) + quantite);
      villeByConcert.set(concertId, concert.ville);
    }

    const total = totalCents / 100;

    // 4) Transaction : décrément placesDispo (stock unique) + création commande + tickets
    const commande = await prisma.$transaction(async (tx) => {
      // décrément conditionnel par concert
      for (const [cid, dec] of decByConcert.entries()) {
        const updated = await tx.concert.updateMany({
          where: { id: cid, placesDispo: { gte: dec } },
          data:  { placesDispo: { decrement: dec } }
        });
        if (updated.count === 0) {
          const v = villeByConcert.get(cid) || `#${cid}`;
          throw new Error(`Stock insuffisant pour le concert ${v}`);
        }
      }

      // créer la commande
      const cmd = await tx.commande.create({
        data: {
          userId,
          total: new Prisma.Decimal(total.toFixed(2)),
          dateCommande: new Date(),
          status: 'VALIDEE',               
        }
      });

      // lignes tickets
      for (const l of lignes) {
        await tx.ticket.create({
          data: {
            commandeId: cmd.id,
            concertId: l.concertId,
            type: l.type,
            quantite: l.quantite,
            prixUnitaire: new Prisma.Decimal(l.prixUnitaire.toFixed(2)),
          }
        });
      }

      return cmd;
    });

    // Vider le panier
    await Cart.deleteOne({ userId });

    // Email
    const { cardLast4, exp } = req.body || {};
    cardLast4 = /^\d{4}$/.test(String(cardLast4 || '')) ? String(cardLast4) : null;
    exp = /^\d{2}\/\d{2}$/.test(String(exp || '')) ? String(exp) : null;
    try {
      await mailer.sendMail({
        to: user.email,
        subject: 'Confirmation de votre commande – ABGYhuDJ',
        text:
          `Bonjour ${user.prenom || ''} ${user.nom || ''},
          Merci pour votre commande !
          Total : ${total.toFixed(2)}€
          ${cardLast4 ? `Paiement (carte ••••${cardLast4}${exp ? `, exp ${exp}` : ''}).` : ''}
          À très vite,
          L’équipe ABGYhuDJ`,
        html: `
          <p>Bonjour ${user.prenom || ''} ${user.nom || ''},</p>
          <p>Merci pour votre commande !</p>
          <p><strong>Total :</strong> ${total.toFixed(2)}€</p>
          ${cardLast4 ? `<p>Paiement effectué (carte ••••${cardLast4}${exp ? `, exp ${exp}` : ''}).</p>` : ''}
          <p>À très vite,<br>L’équipe ABGYhuDJ</p>
        `
      });
    } catch (e) {
      console.warn('[Checkout] email échec:', e.message);
    }
    return res.json({ ok:true, commandeId: commande.id });

  } catch (err) {
    console.error('[Checkout] ERREUR:', err && (err.stack || err), err?.code, err?.meta);
    if (/Stock insuffisant/.test(err?.message || '')) {
      return res.status(400).json({ ok:false, message: err.message });
    }
    if (/(concertId manquant|quantite invalide|type invalide|Concert introuvable|Prix invalide)/.test(err?.message || '')) {
      return res.status(400).json({ ok:false, message: err.message });
    }
    return res.status(500).json({ 
      ok:false, 
      message: `Erreur serveur lors du checkout`,
      code: err?.code || null,
      detail: err?.meta || err?.message || null
    });
  }
};