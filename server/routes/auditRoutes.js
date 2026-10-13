import express from 'express';

import { listAudit } from '../controllers/auditController.js';
import { requireAdmin, requirePermission } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', requireAdmin, requirePermission('audit'), listAudit);

export default router;
