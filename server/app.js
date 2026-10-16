import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import quoteRoutes from './routes/quoteRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import userRoutes from './routes/userRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { adminContentRouter, publicContentRouter } from './routes/contentRoutes.js';
import publishRoutes from './routes/publishRoutes.js';
import { databaseState } from './config/db.js';
import { UPLOAD_ROOT } from './middleware/upload.js';

const app = express();

const allowedOrigins = (
  process.env.CLIENT_URL ||
  'http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Needed for correct client IPs (rate limiting) behind a reverse proxy
// (LiteSpeed + Passenger on shared hosting: TRUST_PROXY=1 = one proxy hop).
if (process.env.TRUST_PROXY) {
  app.set(
    'trust proxy',
    Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY
  );
}

app.disable('x-powered-by');

/*
  cPanel "Setup Node.js App" can publish the API under an application URL such
  as rmaplastik.com/api. Depending on the Passenger setup the app receives the
  path with or without that prefix; both arrive at the same routes here.
  (/uploads stays as it is.)
*/
app.use((req, res, next) => {
  if (!req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
    req.url = `/api${req.url === '/' ? '' : req.url}`;
  }
  next();
});


/* =====================================================
   MIDDLEWARE
===================================================== */

// JSON API: no inline content is served, so the strictest defaults apply
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
  strictTransportSecurity: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: false }
    : false,
}));

app.use(
  cors({
    origin: allowedOrigins,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],
  })
);

app.use(
  express.json({
    limit: '1mb',
  })
);


/* =====================================================
   HEALTH
===================================================== */

app.get('/api/health', (_, res) => {
  const database = databaseState();
  const connected = database === 'connected';

  res.set('Cache-Control', 'no-store');

  return res
    .status(connected ? 200 : 503)
    .json({
      status: connected ? 'OK' : 'DEGRADED',
      service: 'RMA API',
      database,
    });
});


/* =====================================================
   ROUTES
===================================================== */

app.use(
  '/api/auth',
  authRoutes
);

app.use(
  '/api/quote',
  quoteRoutes
);

app.use('/api/leads', leadRoutes);

app.use('/api/content', publicContentRouter);

app.use('/api/publish', publishRoutes);

app.use('/api/admin/users', userRoutes);

app.use('/api/admin/audit', auditRoutes);

app.use('/api/admin', adminContentRouter);

// Uploaded images. On the hosting, /uploads is normally served by LiteSpeed from
// a symlink in public_html (see docs/hosting-com-tr-deployment.md); this route
// serves the same folder when the request reaches the API instead.
app.use(
  '/uploads',
  express.static(UPLOAD_ROOT, {
    maxAge: '30d',
    index: false,
    setHeaders: (res) => res.set('Cross-Origin-Resource-Policy', 'cross-origin'),
  })
);


/* =====================================================
   API 404
   BU MUTLAKA ROUTE'LARDAN SONRA OLMALI
===================================================== */

app.use('/api', (_, res) => {
  return res.status(404).json({
    success: false,
    message: 'API endpoint not found.',
  });
});


/* =====================================================
   GLOBAL ERROR
===================================================== */

app.use((error, req, res, next) => {
  // Malformed JSON or oversized body from express.json()
  if (
    error.type === 'entity.parse.failed' ||
    error.type === 'entity.too.large'
  ) {
    return res.status(error.status || 400).json({
      success: false,
      message:
        error.type === 'entity.too.large'
          ? 'Request body is too large.'
          : 'Invalid JSON body.',
    });
  }

  console.error(error);

  return res.status(500).json({
    success: false,
    message: 'Internal server error.',
  });
});

export default app;
