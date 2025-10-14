//connexion à MongoDB
require('dotenv').config();
const  { PrismaClient } = require('@prisma/client');
const app = require('./app');
const connectMongoDB = require('./config/mongo');

const prisma = new PrismaClient();

module.exports = { app, prisma };

