import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { connectDatabase } from './config/db.js';

import quoteRoutes from './routes/quoteRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();

const PORT = process.env.PORT || 5000;


/* =====================================================
   DATABASE
===================================================== */

await connectDatabase();


/* =====================================================
   MIDDLEWARE
===================================================== */

app.use(helmet());

app.use(
  cors({
    origin:
      process.env.CLIENT_URL ||
      'http://localhost:5173',

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
  return res.json({
    status: 'OK',
    service: 'RMA API',
    database: 'connected',
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
  console.error(error);

  return res.status(500).json({
    success: false,
    message: 'Internal server error.',
  });
});


/* =====================================================
   SERVER
===================================================== */

app.listen(PORT, () => {
  console.log(
    `RMA API running on http://localhost:${PORT}`
  );
});