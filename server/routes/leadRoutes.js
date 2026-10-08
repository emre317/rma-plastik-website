import express from 'express';

import {
  createCatalogLead,
  deleteLead,
  exportLeads,
  getLeads,
  getUnreadLeadCount,
  markLeadsRead,
} from '../controllers/leadController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';
import { leadSubmitLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

/* PUBLIC */
router.post('/catalog', leadSubmitLimiter, createCatalogLead);

/* ADMIN */
router.get('/', requireAdmin, getLeads);
router.get('/export', requireAdmin, exportLeads);
router.get('/unread-count', requireAdmin, getUnreadLeadCount);
router.post('/read', requireAdmin, markLeadsRead);
router.delete('/:id', requireAdmin, deleteLead);

export default router;
