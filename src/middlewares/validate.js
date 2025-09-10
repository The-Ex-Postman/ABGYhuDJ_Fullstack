const { z } = require('zod');

exports.validate = (schema) => (req, res, next) => {
  const r = schema.safeParse({ body: req.body, params: req.params, query: req.query });
  if (!r.success) {
    return res.status(400).json({ ok:false, message:'Données invalides' });
  }

  const { body, params, query } = r.data;

  // on remplace seulement le body
  if (body !== undefined) req.body = body;

  // on fusionne params/query au lieu de les remplacer
  if (params && typeof req.params === 'object') Object.assign(req.params, params);
  if (query  && typeof req.query  === 'object') Object.assign(req.query,  query);

  next();
};