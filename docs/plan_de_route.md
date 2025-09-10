# Plan de route – ABGYhuDJ

## 1) Contexte & objectifs
- Vente de billets de concerts (front + back).
- Stock fiable, commandes sécurisées, e-mail de confirmation.

## 2) Jalons
- [x] Authentification / profils
- [x] Catalogue concerts
- [x] Panier (Mongo) + synchro
- [x] Checkout (Commande + Tickets + décrément stock)
- [x] Historique commandes
- [x] Emails (Ethereal dev / Gmail prod)
- [x] Admin CRUD concerts
- [ ] Sécurité avancée (CSRF/CSP, rate-limit partout)
- [ ] Tests E2E + CI
- [ ] Déploiement prod (Nginx + TLS + PM2)

## 3) Réalisé (log succinct)
-  création schéma Prisma + DDL `00_create_all.sql`
-  panier Mongo (1 doc/user) + TTL
-  contrôles stock à l’ajout + décrément au checkout
-  intégration email (Ethereal/Gmail)
-  corrections front (payloads, affichages récap, responsive)
- page admin : gestion des concerts et du stock de places disponibles

## 4) À faire (prochaines étapes)
- **Sécurité** : CSRF global, CSP stricte, session store persistant
- **Qualité** : tests automatisés (supertest), lint + CI
- **Admin** : export CSV ventes
- **Perf/UX** : cacher des métas concerts pour le récap, micro-interactions

## 5) Décisions techniques
- Stock global sur `Concert.placesDispo` (assis + debout).
- Mongo comme **état transitoire** (TTL + suppression après checkout).
- Prix figés uniquement au niveau des Tickets (source autoritaire).

## 6) Risques & mitigations
- **Surventes** : double validation du stock (ajout + checkout).
- **Échec email** : la commande reste valide (log + retry possible).
- **Incohérences panier** : suppression au logout / TTL / clear après checkout.

## 7) Outils & scripts utiles
```bash
# Démarrer en dev
npm run dev

# Migrations (dev)
npx prisma migrate dev

# Reset (danger – dev)
npx prisma migrate reset

# Tests Postman (exemple)
newman run postman/ABGYhuDJ_checkout_profile_csrf_flow.json -e postman/ABGYhuDJ.postman_environment.json
```
