const app = require('../app');
const connectMongoDB = require('../config/mongo');

let mongoReady; // cache de promesse pour réutiliser la connexion
module.exports = async (req, res) => {
  try {
    if (!mongoReady) mongoReady = connectMongoDB();
    await mongoReady;
    return app(req, res); // ⚡️ délègue à Express
  } catch (err) {
    console.error('API init error', err);
    res.status(500).json({ ok: false, message: 'Erreur serveur' });
  }
};