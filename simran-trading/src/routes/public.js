import express from 'express';
import { body, validationResult } from 'express-validator';
import db from '../models/db.js';

const router = express.Router();

function getLocalized(textEn, textMr, lang) {
  return lang === 'mr' && textMr ? textMr : textEn || '';
}

router.get('/', (req, res) => {
  const lang = res.locals.lang;
  const categories = db
    .prepare('SELECT id, name_en, name_mr, slug FROM categories WHERE is_active = 1 ORDER BY display_order, name_en')
    .all();
  const heroTagline = lang === 'mr' ? '20+ वर्षांपासून विश्वासार्ह आयुर्वेदिक आणि हर्बल उत्पादने' : 'Trusted Ayurvedic & Herbal Products Since 20+ Years';
  res.render('home', {
    title: 'Home',
    categories,
    heroTagline,
  });
});

router.get('/about', (req, res) => {
  res.render('about', { title: 'About Us' });
});

router.get('/products', (req, res) => {
  const lang = res.locals.lang;
  const categorySlug = req.query.category || null;
  const categories = db
    .prepare('SELECT id, name_en, name_mr, slug FROM categories WHERE is_active = 1 ORDER BY display_order, name_en')
    .all();

  let selectedCategory = null;
  if (categorySlug) {
    selectedCategory = db.prepare('SELECT * FROM categories WHERE slug = ? AND is_active = 1').get(categorySlug);
  }

  let products;
  if (selectedCategory) {
    products = db
      .prepare('SELECT * FROM products WHERE is_active = 1 AND category_id = ? ORDER BY display_order, name_en')
      .all(selectedCategory.id);
  } else {
    products = db
      .prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY display_order, name_en')
      .all();
  }

  // Group products by category
  const productsByCategory = new Map();
  for (const category of categories) {
    productsByCategory.set(category.slug, { category, products: [] });
  }
  for (const p of products) {
    const cat = categories.find((c) => c.id === p.category_id);
    if (cat) {
      productsByCategory.get(cat.slug).products.push(p);
    }
  }

  res.render('products', {
    title: 'Products',
    categories,
    productsByCategory: Array.from(productsByCategory.values()),
    getLocalized,
    selectedCategorySlug: categorySlug,
  });
});

router.get('/how-to-order', (req, res) => {
  res.render('how-to-order', { title: 'How to Order' });
});

router.get('/contact', (req, res) => {
  res.render('contact', { title: 'Contact' });
});

router.post(
  '/contact',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name required'),
    body('phone').trim().isLength({ min: 8 }).withMessage('Valid phone required'),
    body('message').trim().isLength({ min: 5 }).withMessage('Message required'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', errors.array().map((e) => e.msg).join(', '));
      return res.redirect('/contact');
    }

    const { name, phone, message } = req.body;
    db.prepare('INSERT INTO contacts (name, phone, message) VALUES (?, ?, ?)').run(name, phone, message);
    req.flash('success', 'Thanks! We will get back to you shortly.');
    return res.redirect('/contact');
  }
);

router.get('/set-lang/:lang', (req, res) => {
  req.session.lang = req.params.lang === 'mr' ? 'mr' : 'en';
  const back = req.get('Referer') || '/';
  res.redirect(back);
});

export default router;