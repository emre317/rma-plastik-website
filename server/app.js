import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';

import quoteRoutes from './routes/quoteRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { adminContentRouter, publicContentRouter } from './routes/contentRoutes.js';
import { UPLOAD_ROOT } from './middleware/upload.js';

const app = express();

const allowedOrigins = (
  process.env.CLIENT_URL ||
  'http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Needed for correct client IPs (rate limiting) behind a reverse proxy.
if (process.env.TRUST_PROXY) {
  app.set(
    'trust proxy',
    Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY
  );
}


/* =====================================================
   MIDDLEWARE
===================================================== */

app.use(helmet());

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
  const connected =
    mongoose.connection.readyState === 1;

  return res
    .status(connected ? 200 : 503)
    .json({
      status: connected ? 'OK' : 'DEGRADED',
      service: 'RMA API',
      database: connected
        ? 'connected'
        : 'disconnected',
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

app.use('/api/admin', adminContentRouter);

// Uploaded product images (nginx can serve this folder directly in production)
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
