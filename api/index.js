const { app, prisma } = require('../src/server');
const connectMongoDB = require('../src/config/mongo');

let mongoReady;
module.exports = async (req, res) => {
  try {
    if (!mongoReady) mongoReady = connectMongoDB();
    await mongoReady;
    return app(req, res);
  } catch (err) {
    console.error('API init error', err);
    res.status(500).json({ ok: false, message: 'Erreur serveur' });
  }
};