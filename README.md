# RMA Plastik Corporate Website

Premium B2B corporate website architecture for RMA Plastik.

## Stack
- React + Vite
- React Router
- Node.js + Express
- MongoDB-ready API architecture

## Phase 1
- Brand and information architecture
- Design system foundation
- Homepage wireframe and component architecture
- API skeleton

## Planned modules
Products, Industries, Technologies, Engineering, Company, Resources, RFQ, Admin.

## Local development

```bash
# API (needs MongoDB)
cd server
cp .env.example .env        # fill in MONGODB_URI, JWT_SECRET
npm install
npm run create-admin        # uses ADMIN_EMAIL / ADMIN_PASSWORD from .env
npm run dev                 # http://localhost:5000

# Website
cd client
npm install
npm run dev                 # http://localhost:5173 (proxies /api to :5000)
```

In production, set `VITE_API_URL` for the client build and `CLIENT_URL` (comma-separated allowed origins) for the API.

## SEO, analytics and production build

`npm run build` (client) builds the app, prerenders every public page in TR/EN/AR to
static HTML (`dist/<lang>/<path>/index.html`) and writes `sitemap.xml` and `robots.txt`.
Page `<head>` tags come from `src/seo/Seo.jsx`; measurement goes through Google Tag Manager
(`VITE_GTM_ID`) with Consent Mode v2 and a cookie banner. See
[docs/analytics-seo-setup.md](docs/analytics-seo-setup.md) for GTM, GA4, Google Ads,
Meta Pixel, Hotjar, Search Console and nginx setup.

## Content management (admin panel)

Products, page texts and contact settings are edited at `/admin` and stored in MongoDB.
"Yayınla" (Publish) rebuilds the static site from `/api/content`. First run on the server:
`cd server && npm run seed-content`. Details: [docs/content-management.md](docs/content-management.md).

## Quote request emails

Every quote form submission is saved to MongoDB and emailed to `QUOTE_NOTIFY_TO`
(`server/services/quoteEmail.js`). "Reply" in the inbox goes straight to the customer.
Set these in `server/.env`:

| Variable | Example |
| --- | --- |
| `SMTP_HOST` / `SMTP_PORT` | `smtp.gmail.com` / `465` |
| `SMTP_USER` | Gmail address that sends the mail |
| `SMTP_PASS` | Google **App Password** (Google Account → Security → 2-Step Verification → App passwords) |
| `MAIL_FROM` | optional, e.g. `"RMA Plastik Web" <info@rmaplastik.com>` |
| `QUOTE_NOTIFY_TO` | `emreayranci007@gmail.com` (comma-separated for several) |

Without SMTP settings the request is still saved and a warning is logged; a mail
error never fails the customer's submission.

## Languages (TR / EN / AR)

- Public pages live under a language prefix: `/tr/...`, `/en/...`, `/ar/...`.
  `/` and old unprefixed links redirect to the visitor's saved language, otherwise Turkish (default).
- Texts are in `client/src/i18n/locales/{tr,en,ar}.js`. All three files must keep the same keys;
  product texts are under `catalog.<product-slug>`.
- Arabic switches the page to right-to-left. Use logical CSS properties
  (`inset-inline-start`, `padding-inline-end`, `text-align: start`, ...) instead of `left`/`right`
  so new styles mirror automatically.
- The admin panel stays in English. Each quote request stores the site language it was sent from.
