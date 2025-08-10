import express from 'express';
import session from 'express-session';
import path from 'path';
import compression from 'compression';
import helmet from 'helmet';
// import xssClean from 'xss-clean';
import flash from 'connect-flash';
import csrf from 'csurf';
import dotenv from 'dotenv';
import methodOverride from 'method-override';
import expressLayouts from 'express-ejs-layouts';

import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import apiRoutes from './routes/api.js';

dotenv.config();

const app = express();

// Security and performance
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
// app.use(xssClean());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const publicDir = path.join(projectRoot, 'src', 'public');

app.set('views', path.join(projectRoot, 'src', 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');

app.use('/public', express.static(publicDir, { maxAge: '7d', index: false }));
app.use('/uploads', express.static(path.join(publicDir, 'uploads'), { maxAge: '7d' }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'simran-trading-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 1000 * 60 * 60 * 8 },
  })
);
app.use(flash());

// CSRF
const csrfProtection = csrf();
app.use((req, res, next) => {
  // Skip CSRF for API JSON reads
  if (req.path.startsWith('/api') && req.method === 'GET') return next();
  return csrfProtection(req, res, next);
});

// Localization
app.use((req, res, next) => {
  if (req.query.lang) {
    req.session.lang = req.query.lang === 'mr' ? 'mr' : 'en';
  }
  res.locals.lang = req.session.lang || 'en';
  res.locals.company = {
    name: 'Simran Trading Company',
    address: 'Shop No. 3, Near Shani Mandir, Peth Road, Nashik-03, Maharashtra',
    phones: ['9730076826', '9860617286'],
  };
  res.locals.whatsappNumber = '9730076826';
  res.locals.csrfToken = typeof req.csrfToken === 'function' ? req.csrfToken() : '';
  res.locals.flash = {
    success: req.flash('success'),
    error: req.flash('error'),
    info: req.flash('info'),
  };
  res.locals.isAdmin = !!req.session.adminUser;
  next();
});

app.use('/', publicRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('home', { title: 'Page Not Found' });
});

export default app;