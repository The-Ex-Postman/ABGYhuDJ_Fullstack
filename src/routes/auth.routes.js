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

module.exports = router;