Simran Trading Company - Informational Website

Run locally:

1. Node 18+ required
2. Install deps: `npm install`
3. Run dev: `npm run dev` (http://localhost:3000)

Admin panel:
- URL: `/admin`
- Default: admin / changeme123 (configure in `.env`)

Content management:
- Create categories first (supports English/Marathi labels and ordering)
- Add products under categories, upload images, benefits, ingredients, optional price and WhatsApp number
- Products appear grouped by category on `/products`

Contact form submissions are stored under Admin > Contacts.

Security notes:
- CSRF enabled for forms
- Sessions with httpOnly cookies

Deployment:
- Use `PORT` env var
- Persist `data/app.db` volume
- Serve `src/public` statics behind a proxy/CDN if desired