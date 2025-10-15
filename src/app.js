const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const ROOT = process.cwd();

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          'https://kit.fontawesome.com',
          'https://ka-f.fontawesome.com',
        ],
        styleSrc: [
          "'self'",
          'https:',
          "'unsafe-inline'"
        ],
        fontSrc: [
          "'self'",
          'https:',
          'data:'
        ],
        connectSrc: [
          "'self'",
          'https://ka-f.fontawesome.com',
        ],
        imgSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);

const { twig } = require('twig');
app.set('view engine', 'twig');
app.set('views', path.join(ROOT, 'views'));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const session = require('express-session');
const MongoStore = require('connect-mongo');
const ONE_HOUR = 1000 * 60 * 60;
const MONGO_URI = process.env.MONGODB_URI;

app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGO_URI,
    ttl: 60 * 60 * 24 * 7,
    collectionName: 'sessions',
  }),
  cookie: {
    maxAge: ONE_HOUR,
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
  }
}));

app.use('/public', express.static(path.join(ROOT, 'public')));

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

const logger = require('./middlewares/logger');
app.use(logger);

const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 20, standardHeaders:true, legacyHeaders:false });
app.use(['/login','/mot-de-passe-oublie','/reinitialiser-mot-de-passe'], authLimiter);

const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

const accountRoutes = require('./routes/account.routes');
app.use('/', accountRoutes);

const orderRoutes = require('./routes/order.routes');
app.use('/', orderRoutes);

const pageRoutes = require('./routes/pages.routes');
app.use('/', pageRoutes);

const cartRoutes = require('./routes/cart.routes');
app.use('/api/cart', cartRoutes);

app.use('/', require('./routes/password.routes'));

app.use('/', require('./routes/admin.routes'));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  const isApi =
    req.originalUrl.includes('/api') ||
    (req.headers.accept || '').includes('application/json');

  const status =
    err.status || err.statusCode || (err?.name === 'ZodError' ? 400 : 500);

  console.error('[ERROR]', err && (err.stack || err), err?.code, err?.meta);

  if (isApi) {
    return res.status(status).json({
      ok: false,
      message: process.env.NODE_ENV === 'production' ? 'Erreur serveur' : (err.message || 'Erreur serveur'),
      code:    process.env.NODE_ENV === 'production' ? undefined : (err?.code ?? null),
      detail:  process.env.NODE_ENV === 'production' ? undefined : (err?.meta ?? err?.stack ?? null),
    });
  }
  res.status(status).render('error', { message: 'Une erreur est survenue' });
});

module.exports = app;
