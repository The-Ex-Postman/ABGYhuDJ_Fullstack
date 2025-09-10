const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const mailer = require('../config/mailer');

/** Formulaire "Mot de passe oublié" */
router.get('/mot-de-passe-oublie', (req, res) => {
  res.render('forgot-password', { title: 'Mot de passe oublié', sent: false });
});

/** Envoi du lien par email (réponse générique pour éviter l’énumération) */
router.post('/mot-de-passe-oublie', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const raw = crypto.randomBytes(32).toString('hex'); // token brut
      const hash = crypto.createHash('sha256').update(raw).digest('hex');
      const exp  = new Date(Date.now() + 15 * 60 * 1000); // 15 min

      await prisma.user.update({
        where: { id: user.id },
        data: { resetTokenHash: hash, resetTokenExp: exp }
      });

      const url = `${req.protocol}://${req.get('host')}/reinitialiser-mot-de-passe?token=${raw}&email=${encodeURIComponent(email)}`;

      await mailer.sendMail({
        to: email,
        subject: 'Réinitialisation de votre mot de passe',
        html: `
          <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
          <p>Ce lien expirera dans <strong>15 minutes</strong> :</p>
          <p><a href="${url}">${url}</a></p>
          <p>Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet e-mail.</p>
        `
      });
    }

    // Réponse toujours identique
    res.render('forgot-password', { title: 'Mot de passe oublié', sent: true });
  } catch (e) {
    console.error('[forgot-password] error:', e);
    res.render('forgot-password', { title: 'Mot de passe oublié', sent: true });
  }
});

/** Form reset */
router.get('/reinitialiser-mot-de-passe', (req, res) => {
  const { token, email } = req.query;
  if (!token || !email) return res.status(400).send('Lien invalide');
  res.render('reset-password', { title:'Réinitialiser le mot de passe', token, email, error: null, ok: false });
});

/** Soumission nouveau mot de passe */
router.post('/reinitialiser-mot-de-passe', async (req, res) => {
  try {
    const { token, email, password, confirm } = req.body;
    if (!token || !email) return res.status(400).send('Lien invalide');

    if (!password || password.length < 8 || password !== confirm) {
      return res.render('reset-password', {
        title:'Réinitialiser le mot de passe', token, email,
        error: 'Mot de passe invalide (8+ caractères) ou confirmation différente.',
        ok: false
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase() }
    });
    const hash = crypto.createHash('sha256').update(String(token)).digest('hex');
    const now  = new Date();

    if (!user || !user.resetTokenHash || !user.resetTokenExp ||
        user.resetTokenHash !== hash || user.resetTokenExp < now) {
      return res.render('reset-password', {
        title:'Réinitialiser le mot de passe',
        token:'', email:'',
        error:'Lien invalide ou expiré. Recommencez la procédure.',
        ok:false
      });
    }

    const newHash = await bcrypt.hash(password, 12); // adapte si tu utilises autre chose
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: newHash,             // <-- renomme si ton champ diffère
        resetTokenHash: null,
        resetTokenExp: null,
        passwordChangedAt: new Date()
      }
    });

    res.render('login', { title:'Connexion', resetDone: true });
  } catch (e) {
    console.error('[reset-password] error:', e);
    res.status(500).send('Erreur serveur');
  }
});

module.exports = router;