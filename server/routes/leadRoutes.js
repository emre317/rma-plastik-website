import express from 'express';

import {
  createCatalogLead,
  deleteLead,
  exportLeads,
  getLeads,
  getUnreadLeadCount,
  markLeadsRead,
} from '../controllers/leadController.js';
import { requireAdmin, requirePermission } from '../middleware/authMiddleware.js';
import { leadSubmitLimiter } from '../middleware/rateLimit.js';
import Lead from '../models/Lead.js';
import { audit } from '../services/audit.js';

const router = express.Router();

/* PUBLIC */
router.post('/catalog', leadSubmitLimiter, createCatalogLead);

/* ADMIN */
const sales = requirePermission('sales');

router.get('/', requireAdmin, sales, getLeads);
router.get('/export', requireAdmin, sales, audit({ area: 'sales', type: 'lead', action: 'Potansiyel müşterileri Excel’e aktardı', details: (req, data, before, body) => `${body?.data?.length || 0} kayıt` }), exportLeads);
router.get('/unread-count', requireAdmin, sales, getUnreadLeadCount);
router.post('/read', requireAdmin, sales, markLeadsRead);
router.delete('/:id', requireAdmin, sales, audit({ area: 'sales', type: 'lead', action: 'Potansiyel müşteri kaydını sildi', lookup: Lead }), deleteLead);

export default router;
