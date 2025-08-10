import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import { body, validationResult } from 'express-validator';
import db from '../models/db.js';

const router = express.Router();

function ensureAdmin(req, res, next) {
  if (!req.session.adminUser) {
    return res.redirect('/admin/login');
  }
  next();
}

// Multer setup
const uploadDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9\-]+/gi, '-').toLowerCase();
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});
const upload = multer({ storage });

router.get('/login', (req, res) => {
  res.render('admin/login', { title: 'Admin Login' });
});

router.post(
  '/login',
  [body('username').trim().notEmpty(), body('password').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/admin/login');
    }
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
    if (!user) {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/admin/login');
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/admin/login');
    }
    req.session.adminUser = { id: user.id, username: user.username };
    res.redirect('/admin');
  }
);

router.post('/logout', ensureAdmin, (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

router.get('/', ensureAdmin, (req, res) => {
  const catCount = db.prepare('SELECT COUNT(*) AS c FROM categories').get().c;
  const prodCount = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  const contactCount = db.prepare('SELECT COUNT(*) AS c FROM contacts').get().c;
  res.render('admin/dashboard', { title: 'Dashboard', catCount, prodCount, contactCount });
});

// Categories
router.get('/categories', ensureAdmin, (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY display_order, name_en').all();
  res.render('admin/categories', { title: 'Categories', categories });
});

router.get('/categories/new', ensureAdmin, (req, res) => {
  res.render('admin/category-form', { title: 'New Category', category: null });
});

router.post(
  '/categories',
  ensureAdmin,
  [body('name_en').trim().notEmpty(), body('slug').trim().notEmpty()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', 'Name and slug are required');
      return res.redirect('/admin/categories/new');
    }
    const { name_en, name_mr, slug, description_en, description_mr, display_order, is_active } = req.body;
    try {
      db.prepare(
        'INSERT INTO categories (name_en, name_mr, slug, description_en, description_mr, display_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(name_en, name_mr || null, slug, description_en || null, description_mr || null, Number(display_order) || 0, is_active ? 1 : 0);
      req.flash('success', 'Category created');
      res.redirect('/admin/categories');
    } catch (e) {
      req.flash('error', 'Slug must be unique');
      res.redirect('/admin/categories/new');
    }
  }
);

router.get('/categories/:id/edit', ensureAdmin, (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) return res.redirect('/admin/categories');
  res.render('admin/category-form', { title: 'Edit Category', category });
});

router.post('/categories/:id', ensureAdmin, (req, res) => {
  const { name_en, name_mr, slug, description_en, description_mr, display_order, is_active } = req.body;
  try {
    db.prepare(
      'UPDATE categories SET name_en = ?, name_mr = ?, slug = ?, description_en = ?, description_mr = ?, display_order = ?, is_active = ? WHERE id = ?'
    ).run(
      name_en,
      name_mr || null,
      slug,
      description_en || null,
      description_mr || null,
      Number(display_order) || 0,
      is_active ? 1 : 0,
      req.params.id
    );
    req.flash('success', 'Category updated');
  } catch (e) {
    req.flash('error', 'Update failed, possibly duplicate slug');
  }
  res.redirect('/admin/categories');
});

router.post('/categories/:id/delete', ensureAdmin, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  req.flash('success', 'Category deleted');
  res.redirect('/admin/categories');
});

// Products
router.get('/products', ensureAdmin, (req, res) => {
  const products = db
    .prepare(
      `SELECT p.*, c.name_en AS category_name_en, c.name_mr AS category_name_mr
       FROM products p JOIN categories c ON c.id = p.category_id
       ORDER BY c.display_order, p.display_order, p.name_en`
    )
    .all();
  res.render('admin/products', { title: 'Products', products });
});

router.get('/products/new', ensureAdmin, (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY display_order, name_en').all();
  res.render('admin/product-form', { title: 'New Product', product: null, categories });
});

router.post(
  '/products',
  ensureAdmin,
  upload.single('image'),
  [body('name_en').trim().notEmpty(), body('category_id').notEmpty()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', 'Please fill required fields');
      return res.redirect('/admin/products/new');
    }
    const {
      category_id,
      name_en,
      name_mr,
      benefits_en,
      benefits_mr,
      ingredients_en,
      ingredients_mr,
      price,
      whatsapp_number,
      display_order,
      is_active,
    } = req.body;
    const image_path = req.file ? `/uploads/${req.file.filename}` : null;

    db.prepare(
      `INSERT INTO products (category_id, name_en, name_mr, benefits_en, benefits_mr, ingredients_en, ingredients_mr, price, image_path, whatsapp_number, display_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      Number(category_id),
      name_en,
      name_mr || null,
      benefits_en || null,
      benefits_mr || null,
      ingredients_en || null,
      ingredients_mr || null,
      price || null,
      image_path,
      whatsapp_number || null,
      Number(display_order) || 0,
      is_active ? 1 : 0
    );

    req.flash('success', 'Product created');
    res.redirect('/admin/products');
  }
);

router.get('/products/:id/edit', ensureAdmin, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.redirect('/admin/products');
  const categories = db.prepare('SELECT * FROM categories ORDER BY display_order, name_en').all();
  res.render('admin/product-form', { title: 'Edit Product', product, categories });
});

router.post(
  '/products/:id',
  ensureAdmin,
  upload.single('image'),
  (req, res) => {
    const {
      category_id,
      name_en,
      name_mr,
      benefits_en,
      benefits_mr,
      ingredients_en,
      ingredients_mr,
      price,
      whatsapp_number,
      display_order,
      is_active,
    } = req.body;
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    let image_path = product?.image_path || null;
    if (req.file) {
      image_path = `/uploads/${req.file.filename}`;
    }

    db.prepare(
      `UPDATE products SET category_id = ?, name_en = ?, name_mr = ?, benefits_en = ?, benefits_mr = ?, ingredients_en = ?, ingredients_mr = ?, price = ?, image_path = ?, whatsapp_number = ?, display_order = ?, is_active = ? WHERE id = ?`
    ).run(
      Number(category_id),
      name_en,
      name_mr || null,
      benefits_en || null,
      benefits_mr || null,
      ingredients_en || null,
      ingredients_mr || null,
      price || null,
      image_path,
      whatsapp_number || null,
      Number(display_order) || 0,
      is_active ? 1 : 0,
      req.params.id
    );

    req.flash('success', 'Product updated');
    res.redirect('/admin/products');
  }
);

router.post('/products/:id/delete', ensureAdmin, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  req.flash('success', 'Product deleted');
  res.redirect('/admin/products');
});

// Contacts
router.get('/contacts', ensureAdmin, (req, res) => {
  const contacts = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
  res.render('admin/contacts', { title: 'Contacts', contacts });
});

export default router;