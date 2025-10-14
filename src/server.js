//connexion à MongoDB
require('dotenv').config();
const app = require('./app');
const connectMongoDB = require('./config/mongo');

module.exports = app;

