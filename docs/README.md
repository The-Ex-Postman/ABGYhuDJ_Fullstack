# ABGYhuDJ – Billetterie (Full-Stack)

Application web de billetterie pour une tournée de concerts.  
Back-end **Node.js/Express** + **Prisma (PostgreSQL)** pour les données critiques, **MongoDB** pour le panier temporaire, **Twig** + JS vanilla pour le front.

## Sommaire
- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Arborescence](#arborescence)
- [Prérequis](#prérequis)
- [Configuration (.env)](#configuration-env)
- [Démarrage rapide](#démarrage-rapide)
- [Base SQL (Prisma & DDL)](#base-sql-prisma--ddl)
- [Modèle NoSQL (Mongo – Panier)](#modèle-nosql-mongo--panier)
- [Règles métier](#règles-métier)
- [API (routes principales)](#api-routes-principales)
- [Séquences métier](#séquences-métier)
- [Sécurité](#sécurité)
- [Tests (Postman/Newman)](#tests-postmannewman)
- [Déploiement](#déploiement)
- [Dépannage](#dépannage)
- [Roadmap](#roadmap)
- [Annexes](#annexes)

## Fonctionnalités
- Authentification par session (login/logout).
- Profil utilisateur (infos facturation).
- Catalogue des concerts (prix assis/debout, **stock**).
- Panier **temporaire** (MongoDB) avec merge intelligent.
- Checkout : création **Commande + Tickets** (PostgreSQL), **décrément du stock**, email de confirmation.
- Historique des commandes (profil).
- Profil admin : Gestion des stocks et des concerts.

## Architecture

### Vue d'ensemble
Application Node.js/Express organisée en MVC combinant :
- **SSR** via **Twig** pour les pages,
- **API JSON** pour les actions asynchrones (panier, checkout),
- Authentification par session (cookie signé + store côté serveur),
- **PostgreSQL + Prisma** pour les données métiers (User, Concert, Commande, Ticket),
- **MongoDB (Mongoose)** pour le panier (stockage volatile lié à l'utilisateur),
- **Nodemailer** pour l'email de confirmation de commande
- Schémas :
- Architecture : `docs/diagramme-architecture.jpg`
- Use cases : `docs/uses-case.jpg`
- Modèle de données : `docs/schema-postgre.jpg`

### Composants principaux
**Router (Express)**
Regroupe les routes par domaine : `/auth`, `/account`, `/api/cart`, `/checkout`,...
**Middlewares**
- `requireAuth` : Protège les routes privées (redirige et renvoie `401`JSON).
- `requireAdmin` : RBAC via `isAdminUser` (rôle, flag, liste d'e-mails).
- Validation d'inputs côté serveur (sanitisation, formats, bornes).
**Controllers**
- auth: inscription/connexion, hash bcrypt, enrichit la session (`isAdmin` via `isAdminUser`).
- account: mise à jour du profil avec contrôles.
- cart: opérations de panier (MongoDB) + garde-fous.
- order: checkout transactionnel (recalcul serveur des prix, décrément du stock, création commande + ticket, purge du panier, envoie d'e-mail).
**Vues (Twig)**
Pages SSR + formulaires et `fetch` côté client
**Données**
- PostgreSQL (Prisma) : Table `User`, `Concert`, `Commande`, `Ticket`.
- MongoDB(Mongoose) : collections `Cart` (contenu temporaire par userId), `Log` (exploitation à venir pour les statistiques de trafic utilisateur).

### Cycle d'une requête
1. Client (page Twig / JS) --> Route Express
2. Passage par Middlewares (auth, admin, validations)
3. Controller exécute la logique :
- lit/écrit via Prisma (PostgreSQL) ou Mongoose (MongoDB),
- rend une vue Twig ou renvoie du JSON
- peut déclencher Nodemailer pour l'e-mail
4. Réponse --> Client (HTML/SSR ou JSON)

### Session et rôles
- Session signée envoyée en cookie (ID de session)
- Données utilisateur côté serveur (id, email isAdmin)
- Vérification d'accès admin centralisée via isAdminUser(user) (source de vérité unique)

### Sécurité et validation
- Hash des mots de passe avec bcrypt
- Validations front (UX) et serveur (sécurité) : e-mail, mot de passe, taille des champs, quantité, format de paiement fictif
- Recalcul intégral des montants côté serveur (le client ne fait que proposer)
- Secrets/paramètres en variables d'environnement (`.env`); modèles dans `.env.example`
- Accès admin limité par rôle/flag/liste d'e-mails

### Erreurs et conventions de réponse
- SSR: redirections + messages dans la vue en cas d'erreur utilisateur
- API: statuts HTTP cohérents et payloads normalisés

### Limites actuelles et pistes d'évolution
- Enrichir les fonctionnalités Admin (étude des logs, stats de vente)

## Arborescence
```
src/
  controllers/
    cart.controller.js
    order.controller.js
    auth.controller.js
    account.controller.js           
  middlewares/
    requireAuth.js         # garde d’auth pour pages/API
    logger.js
    requireAdmin.js
    validate.js
    verifyToken.js
  models/
    cart.js                       # Mongoose: collection "carts"
    log.js                        # Mongoose: collection "logs"
  routes/
    cart.routes.js                # /api/cart/...
    order.routes.js               # /formulaire, /api/checkout/confirm, /mes-commandes...
    pages.routes.js               # pages Twig (/accueil, /billeterie, /login...)
    account.routes.js             # /mon-compte, /delete-account
    admin.routes.js               # /admin, /admin/api/concert...
    auth.routes.js                # /register, /login...
    password.routes.js            # /mot-de-passe-oublie, /reinitialiser-mot-de-passe
  views/                          # templates Twig
  public/                         # styles, scripts, assets
prisma/
  schema.prisma
  migrations/                     # migrations Prisma
  sql/00_create_all.sql           # DDL complet (livrable)
postman/
  ABGYhuDJ_admin_api_stock.postman_collection.json
  ABGYhuDJ_checkout_profile_csrf_flow.json
  ABGYhuDJ.postman_environment.json
```

## Prérequis
- Node.js ≥ 18 (idéal ≥ 20)
- PostgreSQL accessible (local ou hébergé)
- MongoDB accessible (local ou hébergé)
- Un serveur SMTP (ou **Ethereal** en dev)

## Configuration (.env)
Crée un fichier `.env` à la racine :

```env
# Base SQL (PostgreSQL)
DATABASE_URL="postgresql://user:pass@localhost:5432/abgyhujd?schema=public"

# Base NoSQL (MongoDB)
MONGO_URL="mongodb://localhost:27017/abgyhujd"

# Sessions
SESSION_SECRET="change-me"
NODE_ENV="development"

# SMTP (DEV – Ethereal)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=xxxxxxxx
SMTP_PASS=xxxxxxxx
SMTP_SECURE=false

# SMTP (PROD – Gmail App Password, remplacer les 4 lignes ci-dessus)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=465
# SMTP_USER=toncompte@gmail.com
# SMTP_PASS=mot_de_passe_application
# SMTP_SECURE=true
```


## Démarrage rapide
```bash
# Install
npm i

# Migrations SQL (dev)
npx prisma migrate dev

# (Optionnel) Démarrage en dev
npm run dev

# Accès: http://localhost:5000
```

## Base SQL (Prisma & DDL)
- Le schéma est défini dans `prisma/schema.prisma`.
- Les migrations Prisma se trouvent dans `prisma/migrations`.
- Le **DDL complet** est dans `prisma/sql/00_create_all.sql`.

### Tables / Enums
- **User** (email unique, password hash, profil)
- **Concert** (ville, date, lieu, `placesDispo`, prix assis/debout)
- **Commande** (userId, date, total, status)
- **Ticket** (concertId, commandeId, type, quantite, prixUnitaire)
- **Enums** : `Role(USER|ADMIN)`, `Status(EN_COURS|VALIDEE)`, `PlaceType(DEBOUT|ASSIS)`

### Index / Contraintes notables
- `User.email` UNIQUE
- `Concert` UNIQUE `(ville, date, lieu)` + index sur `date`
- `Ticket` index `(concertId)` et `(commandeId)`
- `Commande` index `(userId, dateCommande)`

## Modèle NoSQL (Mongo – Panier)
**Collection** : `carts` (1 document par utilisateur)

```json
{
  "_id": "ObjectId",
  "userId": 42,
  "items": [
    { "concertId": 1, "type": "debout", "quantite": 1, "prixUnitaire": 40, "addedAt": "2025-08-19T11:01:00Z" }
  ],
  "updatedAt": "2025-08-19T11:03:00Z",
  "expiresAt": "2025-08-26T11:03:00Z"
}
```

- Index **unique** sur `userId` → 1 panier/user.  
- Index **TTL** sur `expiresAt` (`expireAfterSeconds: 0`) → purge des paniers expirés.
- `items` est **re-validé** côté API (types, quantités, stock).

## Règles métier
- **Stock**: champ `placesDispo` au niveau `Concert` (stock global, pas de split assis/debout).  
  - À l’ajout au panier : on vérifie `déjà_dans_panier + demandé ≤ placesDispo`.
  - Au checkout : on décrémente `placesDispo` selon la **somme** des tickets créés.
- **Prix**: le prix du panier est indicatif ; **source autoritaire = SQL** au moment des Tickets.
- **Panier**: merge par `(concertId, type)` (quantités s’additionnent).
- **Email**: confirmation envoyée après création Commande + Tickets (failure-safe : la commande réussit même si l’email échoue).

## API (routes principales)

### Panier (Mongo)
- **GET `/api/cart/get`** → `{ ok:true, items:[...], meta:{ [concertId]: {ville,date,lieu,image} } }`
- **POST `/api/cart/add`**  
  Body : `{ items: [{ concertId, type: "debout"|"assis", quantite, prixUnitaire }] }`
- **POST `/api/cart/clear`** → vide le panier utilisateur

### Checkout / Commandes (SQL)
- **GET `/formulaire`** → page Twig (récap + infos facturation)
- **GET `/check-user-info`** → vérifie que le profil est complet
- **POST `/api/checkout/confirm`**  
  Body : `{ cardLast4, exp }` (simulation)  
  Effets : crée `Commande` + `Tickets`, décrémente `placesDispo`, **supprime** le panier Mongo, envoie l’e-mail.

### Pages
- `/billeterie`, `/accueil`, `/mon-compte`, `/mes-commandes`, `/logout`, `/login`…

> Toutes les routes sensibles sont protégées par un **middleware d’auth** (session).

## Séquences métier

### Ajout panier
```
Front → POST /api/cart/add {items}
API → SQL : vérifie concert + stock
API → Mongo : merge/upsert items
API → Front : ok + récap
```

### Checkout
```
Front → POST /api/checkout/confirm
API → Mongo : lit panier
API → SQL : crée Commande + Tickets + décrémente stock
API → Mongo : supprime panier
API → SMTP : envoie email confirmation
API → Front : ok + commandeId
```

## Sécurité
- **Sessions** : cookie `httpOnly`, `sameSite`, `secure` en prod ; secret robuste ; store persistant recommandé (Redis/MongoStore).
- **Passwords** : hash (bcrypt).
- **Validation** systématique des entrées (quantités, enums, ids).
- **CSRF** : à activer (ex. `csurf`) pour les formulaires sensibles.
- **Rate-limit** (login, reset, checkout).
- **Helmet** (CSP, noSniff, etc.).
- **Secrets** seulement via `.env`.

## Tests (Postman/Newman)
Des collections Postman sont fournies dans `postman/`.  
Exécutables avec **Newman** (en CLI) :

```bash
npm i -g newman newman-reporter-htmlextra

# Collection principale + env
newman run postman/collections/ABGYhuDJ_checkout_profile_csrf_flow.json   -e postman/environnements/ABGYhuDJ.postman_environment.json   --reporters cli,htmlextra   --reporter-htmlextra-export newman/report_user.html

# Admin
newman run postman/collections/ABGYhuDJ_admin_concerts.postman_collection.json   -e postman/environnements/ABGYhuDJ.postman_admin_env.json   --reporters cli,htmlextra   --reporter-htmlextra-export newman/report_admin.html
```

> Les rapports HTML se retrouvent dans `newman/` (`report_user.html`, `report_admin.html`).

## Déploiement
1. Créer les bases **PostgreSQL** & **MongoDB** (hébergées).
    Ici les bases son hébergées respectivement sur Supabase (BDD Postgre) et Mongo Atlas (BDD Mongo).
2. Renseigner `.env` (DB, SMTP, `SESSION_SECRET`, `NODE_ENV=production`).
3. `npm ci`
4. `npx prisma migrate deploy`
5. Lancer l’app (PM2 recommandé) :
   ```bash
   npm run start
   # ou
   pm2 start src/server.js --name abgyhujd
   ```
6. Reverse proxy (Nginx) + **TLS**.
7. Activer `helmet`, rate-limit et un **session store** persistant.
8. Script de lancement au format JSON et repo importé sur Vercel.
9. Redéfinir les variables d'env et les URI associées aux BDD.
10. Lancer le déploiement.
## Dépannage
- **Remise à zéro (dev uniquement)** :
  ```bash
  npx prisma migrate reset
  ```
- **Migrations bloquées** : rollback, supprimer la migration fautive, puis `migrate dev`.
- **Email** : en dev, **Ethereal**. En prod, **Gmail App Password**.

## Roadmap
- UI Admin (CRUD Concerts) + stats ventes.
- Tests E2E (supertest) / CI.
- CSP stricte + CSRF sur tout le tunnel de paiement.
- Observabilité (pino + Loki/Grafana).
- Store de session Redis.

## Annexes

### Création d'un compte admin
```bash
npx prisma studio
# Ouvre l'UI -> table "User" -> édition de la ligne utilisateur concerné -> role = ADMIN -> save
```
La connexion en tant qu'administrateur s'effectue via la page de login standart. seules les routes d'admin exigent le rôle.

### Fuseau horaire et formatage des dates
- La base stocke les DateTime (UTC côté PostgreSQL).
- L'affichage est localisé en français et converti Europe/Paris côté serveur.
> Exemple côté Node :
```js
const tz = process.env.TZ || 'Europe/Paris';

const fD = new Intl.DateTimeFormat('fr-FR', {
  timeZone: tz,
  day: '2-digit', month: 'long', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: false
});

const fT = new Intl.DateTimeFormat('fr-FR', {
  timeZone: tz,
  hour: '2-digit', minute: '2-digit', hour12: false
});

// Exemple d'étiquette : "01 juin 2025 - 20h30"
const dateLabel = (date) => `${fD.format(date)} - ${fT.format(date).replace(':', 'h')}`;
```

