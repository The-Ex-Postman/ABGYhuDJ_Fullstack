const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const verifyToken = require('../middlewares/verifyToken');

// Auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Route protégée de test
router.get('/me', verifyToken, (req, res) => {
  res.status(200).json({
    message: 'Voici les infos du token',
    user: req.user
  });
});

//traitement de l'inscription
router.post('/inscription', async (req, res) => {
  const { email, password } = req.body;

  try {
    await authController.register(req, res);
  } catch (err) {
    console.error("Erreur dans la route POST /inscription :", err);
    res.status(500).render('inscription', { error: "Erreur serveur. Réessaie plus tard." });
  }
});

module.exports = router;