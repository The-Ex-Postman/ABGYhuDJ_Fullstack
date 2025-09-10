const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Vérifie la présence du token
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant ou invalide' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Vérifie et décode le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Injecte l'utilisateur décodé dans la requête
    next(); // Passe à la suite
  } catch (err) {
    return res.status(403).json({ message: 'Token invalide ou expiré' });
  }
};

module.exports = verifyToken;