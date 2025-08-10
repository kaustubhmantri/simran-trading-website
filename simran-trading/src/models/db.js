import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dataDir = path.join(projectRoot, 'data');
const dbPath = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.join(dataDir, 'app.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

function runMigrations() {
  const schemaPath = path.join(projectRoot, 'src', 'models', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(sql);
}

async function seedAdminUser() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'changeme123';

  const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(username);
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 12);
    db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
    console.log(`Seeded admin user: ${username}`);
  }
}

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

function seedInitialCatalog() {
  const catCount = db.prepare('SELECT COUNT(*) AS c FROM categories').get().c;
  if (catCount > 0) return;
  const categories = [
    { name_en: 'Chemical Free Herbal Products' },
    { name_en: 'Ayurvedic Products' },
    { name_en: 'Body Care Products' },
    { name_en: 'Skin Care Products' },
    { name_en: 'Weight Loss Products' },
  ].map((c, i) => ({ ...c, slug: slugify(c.name_en), display_order: i + 1 }));

  const insertCat = db.prepare('INSERT INTO categories (name_en, slug, display_order, is_active) VALUES (?, ?, ?, 1)');
  const catIdBySlug = {};
  db.transaction(() => {
    categories.forEach((c) => {
      insertCat.run(c.name_en, c.slug, c.display_order);
      const id = db.prepare('SELECT id FROM categories WHERE slug = ?').get(c.slug).id;
      catIdBySlug[c.slug] = id;
    });
  })();

  const productsByCategory = {
    [slugify('Chemical Free Herbal Products')]: [
      'Adivasi Oil',
      'Adivashi Shampoo',
      'Dermatine Cream',
      'Dazzing Hair Shampoo',
      'Ayurvedic Alovera Soap',
      'Ayurvedic Redwine Soap',
      'Ayurvedic Panchagavya Soap',
      'Ayurvedic Kapoor Soap',
      'Rachni Mehendi',
    ],
    [slugify('Ayurvedic Products')]: [
      'Ayurvedic Vatt Churna',
      'Ayurvedic Sandi Vatt Churna',
      'Ayurvedic Mutt Khada Churna',
      'Ayurvedic Aasthma Churna',
      'Ayurvedic Sada Bavasir Churna',
      'Ayurvedic Khuni Bavasir Churna',
      'Zinzora Malam',
      'Malshodhak Churna',
    ],
    [slugify('Body Care Products')]: [
      'Veda Body Lotion',
      'Veda Shampoo Hair',
      'Veda Cleansing Milk',
      'Veda Facewash',
      'Veda Life Cream',
      'Veda Aloevera Gel',
      'Safrogel Body Lotion',
      'Saundarya Sanskar Body Lotion',
    ],
    [slugify('Skin Care Products')]: [
      'Veda Turmeric',
      "Dr. Upgade's Wang Oil",
      "Dr. Upgade's Wang Soap",
      'Zinpi Lotion',
      'Natrodan Shampoo',
      'Smartglow Shampoo',
      'Pimplora Soap',
      'Pias Cream',
      'Kumkumadi Tailam',
      'Safrogel',
      'Brahmakumari Hair Oil',
      'Bio Collegen Real Deep Mask',
      'Fruit Facial Kit',
      'Gold Facial Kit',
    ],
    [slugify('Weight Loss Products')]: [
      'Bijak Wooden Cup',
    ],
  };

  const insertProduct = db.prepare(
    'INSERT INTO products (category_id, name_en, display_order, is_active, whatsapp_number) VALUES (?, ?, ?, 1, ?)' 
  );
  const defaultWhatsapp = process.env.DEFAULT_WHATSAPP || '9730076826';

  db.transaction(() => {
    Object.entries(productsByCategory).forEach(([catSlug, names]) => {
      const categoryId = catIdBySlug[catSlug];
      names.forEach((name, idx) => {
        insertProduct.run(categoryId, name, idx + 1, defaultWhatsapp);
      });
    });
  })();

  console.log('Seeded initial categories and products');
}

runMigrations();
await seedAdminUser();
seedInitialCatalog();

export default db;