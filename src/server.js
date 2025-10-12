//connexion à MongoDB
require('dotenv').config();
const app = require('express')();
const connectMongoDB = require('./config/mongo');

module.exports = app;

