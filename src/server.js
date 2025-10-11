//connexion à MongoDB
require('dotenv').config();
const app = require('./app');
const connectMongoDB = require('./config/mongo');

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  (async () => {
    await connectMongoDB();
    app.listen(PORT, () => {
      console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
    });
  })();
}

module.exports = app;

// Alternative start server method

const startServer = async () => {
  await connectMongoDB(); // Connexion Mongo
  app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
  });
};

startServer();
