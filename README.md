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

## Languages (TR / EN / AR)

- Public pages live under a language prefix: `/tr/...`, `/en/...`, `/ar/...`.
  `/` and old unprefixed links redirect to the visitor's saved or browser language (fallback: English).
- Texts are in `client/src/i18n/locales/{tr,en,ar}.js`. All three files must keep the same keys;
  product texts are under `catalog.<product-slug>`.
- Arabic switches the page to right-to-left. Use logical CSS properties
  (`inset-inline-start`, `padding-inline-end`, `text-align: start`, ...) instead of `left`/`right`
  so new styles mirror automatically.
- The admin panel stays in English. Each quote request stores the site language it was sent from.
