const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const ROOT = process.cwd();

const app = express();

//autorisation helmet pour font awesome
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
// Config moteur de template Twig
const { twig } = require('twig');
app.set('view engine', 'twig');
app.set('views', path.join(ROOT, 'views'));

// Middlewares de base
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//sessions
const session = require('express-session');
const ONE_HOUR = 1000 * 60 * 60;

app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: ONE_HOUR,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  }
}));

app.use('/public', express.static(path.join(ROOT, 'public')));

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

const logger = require('./middlewares/logger');
app.use(logger);

//Limites Login / Reset MDP
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 20, standardHeaders:true, legacyHeaders:false });
app.use(['/login','/mot-de-passe-oublie','/reinitialiser-mot-de-passe'], authLimiter);

// Routes API
const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

//Routes User DB
const accountRoutes = require('./routes/account.routes');
app.use('/', accountRoutes);

//Routes formulaire DB
const orderRoutes = require('./routes/order.routes');
app.use('/', orderRoutes);

// Routes de pages (HTML)
const pageRoutes = require('./routes/pages.routes');
app.use('/', pageRoutes);

// Routes panier
const cartRoutes = require('./routes/cart.routes');
app.use('/api/cart', cartRoutes);

// Routes mot de passe oublié
app.use('/', require('./routes/password.routes'));

// Routes admin
app.use('/', require('./routes/admin.routes'));

// Handler d’erreurs global
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
