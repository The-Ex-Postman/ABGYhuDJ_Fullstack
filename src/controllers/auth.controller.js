const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();
const Log = require('../models/log');
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

const isEmail = (s='') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim().toLowerCase());
const MIN_PWD = 6;

const isAdminUser = (user) => {
  return user?.role === 'ADMIN' || user?.isAdmin === true || ADMIN_EMAILS.includes(user?.email);
}

const register = async (req, res) => {
  let { email, password, confirmPassword } = req.body || {};
  email = String(email || '').trim().toLowerCase();

  if (!isEmail(email)) {
    return res.status(400).json({ field:'email', message:'❌ Email invalide.' });
  }
  if (typeof password !== 'string' || password.length < MIN_PWD) {
    return res.status(400).json({ field:'password', message:`❌ Mot de passe trop court (min ${MIN_PWD}).` });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ field:'confirm', message:'❌ Les mots de passe ne correspondent pas.' });
  }

  try {
    const existingUser = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (existingUser) {
      return res.status(409).json({ field:'email', message:'❌ Cet email est déjà utilisé.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, role: 'USER' }
    });

    await Log.create({
      type: 'inscription',
      ip: req.ip,
      user_id: user.id,
      route: '/register',
      payload: { email }
    });

    return res.status(200).json({ message: 'Inscription réussie' });

  } catch (error) {
    console.error("Erreur serveur dans le register :", error);
    return res.status(500).render('inscription', {
      error: "Une erreur est survenue. Réessaie plus tard."
    });
  }
};

const login = async (req, res) => {
  let { email, password } = req.body || {};
  email = String(email || '').trim().toLowerCase();

  if (!isEmail(email) || typeof password !== 'string' || password.length < MIN_PWD) {
    return res.status(400).json({ message: '❌ Identifiants invalides' });
  }

  try {
    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });

    if (!user) {
      await Log.create({ type:'connexion', ip:req.ip, route:'/login', payload:{ email, erreur:'Email inconnu' }});
      return res.status(401).json({ message: '❌ Identifiants invalides' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await Log.create({ type:'connexion', ip:req.ip, user_id:user.id, route:'/login', payload:{ email, erreur:'Mot de passe incorrect' }});
      return res.status(401).json({ message: '❌ Identifiants invalides' });
    }

    // Log succès
    await Log.create({ type:'connexion', ip:req.ip, user_id:user.id, route:'/login', payload:{ email }});

    // ➤ enrichir la session
    const admin = isAdminUser(user);
    req.session.user = { id: user.id, email: user.email, role: user.role, isAdmin: admin };
    req.session.userId = user.id;

    // ➤ calcul de la destination
    const wanted = req.session.returnTo || req.query.next;
    const nextUrl = wanted || (admin ? '/admin' : '/accueil');

    return res.status(200).json({ ok: true, user: { id: user.id, email: user.email, role: user.role }, message: 'Connexion réussie', nextUrl });

  } catch (error) {
    console.error("Erreur serveur dans le login :", error);
    return res.status(500).render('index', { error: 'Erreur serveur. Réessaie plus tard.' });
  }
};
module.exports = { login, register, isAdminUser };
