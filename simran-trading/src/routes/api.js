import express from 'express';
import db from '../models/db.js';

const router = express.Router();

router.get('/products/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  return res.json(product);
});

export default router;