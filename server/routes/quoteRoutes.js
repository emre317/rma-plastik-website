import express from 'express';

import {
  createQuoteRequest,
  getQuoteRequests,
  getQuoteRequestById,
  updateQuoteStatus,
  getQuoteStats,
  getUnreadQuoteCount,
  exportQuoteRequests,
  getQuoteReport,
  getQuoteAssignees,
  updateQuoteTracking,
  addQuoteNote,
  deleteQuoteNote,
  saveQuoteOffer,
  sendQuoteOffer,
} from '../controllers/quoteController.js';

import {
  requireAdmin,
} from '../middleware/authMiddleware.js';

import {
  quoteSubmitLimiter,
} from '../middleware/rateLimit.js';

import { offerPdfUpload } from '../middleware/upload.js';

const router = express.Router();


/* PUBLIC */

router.post(
  '/',
  quoteSubmitLimiter,
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
  '/export',
  requireAdmin,
  exportQuoteRequests
);

router.get(
  '/report',
  requireAdmin,
  getQuoteReport
);

router.get(
  '/assignees',
  requireAdmin,
  getQuoteAssignees
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

router.patch(
  '/:id',
  requireAdmin,
  updateQuoteTracking
);

router.post(
  '/:id/notes',
  requireAdmin,
  addQuoteNote
);

router.delete(
  '/:id/notes/:noteId',
  requireAdmin,
  deleteQuoteNote
);

router.put(
  '/:id/offer',
  requireAdmin,
  saveQuoteOffer
);

router.post(
  '/:id/offer/send',
  requireAdmin,
  offerPdfUpload,
  sendQuoteOffer
);

export default router;