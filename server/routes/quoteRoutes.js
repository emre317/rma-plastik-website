import express from 'express';

import {
  createQuoteRequest,
  getQuoteRequests,
  getQuoteRequestById,
  updateQuoteStatus,
  getQuoteStats,
  getUnreadQuoteCount,
} from '../controllers/quoteController.js';

import {
  requireAdmin,
} from '../middleware/authMiddleware.js';

const router = express.Router();


/* PUBLIC */

router.post(
  '/',
  createQuoteRequest
);


/* ADMIN */

router.get(
  '/',
  requireAdmin,
  getQuoteRequests
);

router.get(
  '/stats',
  requireAdmin,
  getQuoteStats
);

router.get(
  '/unread-count',
  requireAdmin,
  getUnreadQuoteCount
);

router.get(
  '/:id',
  requireAdmin,
  getQuoteRequestById
);

router.patch(
  '/:id/status',
  requireAdmin,
  updateQuoteStatus
);

export default router;