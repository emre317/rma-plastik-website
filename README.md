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
