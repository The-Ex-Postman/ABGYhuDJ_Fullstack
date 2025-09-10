const express = require('express');
const router = express.Router();
const { requirePage, requireApi } = require('../middlewares/requireAuth');
const cartController = require('../controllers/cart.controller');

router.get('/get', requireApi, cartController.getCart);
router.post('/clear', requireApi, cartController.clearCart);

const { z } = require('zod');
const { validate } = require('../middlewares/validate');

const addItemSchema = z.object({
  body: z.union([
    z.object({
      items: z.array(z.object({
        concertId: z.number().int().positive(),
        type: z.enum(['debout','assis']),
        quantite: z.number().int().positive(),
        prixUnitaire: z.number().nonnegative()
      })).nonempty()
    }),
    z.object({
      concertId: z.number().int().positive(),
      type: z.enum(['debout','assis']),
      quantite: z.number().int().positive(),
      prixUnitaire: z.number().nonnegative()
    })
  ])
});
router.post('/add', requireApi, validate(addItemSchema), cartController.addToCart);

module.exports = router;


