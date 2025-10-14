//connexion à MongoDB
require('dotenv').config();
const app = require('express')();
const connectMongoDB = require('./config/mongo');

const  { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient();
} else {
    if (!global.prisma) {
        global.prisma = new PrismaClient();
    }
    prisma = global.prisma;
}

module.exports = { app, prisma };

