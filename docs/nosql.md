# Modèle NoSQL (MongoDB)

## 1. Cart (panier)
Document par **utilisateur**, items regroupés par `(concertId, type)`.

```json
{
  "_id": "ObjectId(...)",
  "userId": 123,
  "items": [
    { "concertId": 1, "type": "debout", "quantite": 2, "prixUnitaire": 40 },
    { "concertId": 1, "type": "assis",  "quantite": 1, "prixUnitaire": 50 }
  ],
  "updatedAt": "2025-08-19T12:34:56.000Z"
}
```
**Index**:
```js
db.carts.createIndex({ userId: 1 }, { unique: true });
```

## 2. Log (journalisation)
```json
{
  "_id": "ObjectId(...)",
  "type": "action",
  "ip": "127.0.0.1",
  "route": "/api/cart/add",
  "user_id": 123,
  "payload": {
    "method": "POST",
    "body": { "items": [] }
  },
  "createdAt": "2025-08-19T12:34:56.000Z"
}
```
**Index**:
```js
db.logs.createIndex({ createdAt: -1 });
db.logs.createIndex({ user_id: 1, createdAt: -1 });
```

## 3. Notes
- Données **volatiles** (panier) ➜ Mongo convient très bien.
- Ne jamais stocker d’infos de carte (seulement `cardLast4` au besoin).

