import express from 'express';
import rateLimit from 'express-rate-limit';

import { requireCallbackToken } from '../middleware/serviceAuth.js';
import { reportStage } from '../services/publisher.js';

/* Stage reports of the publish workflow (GitHub Actions) */
const router = express.Router();

const callbackLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false });

const str = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');

router.post('/callback', callbackLimiter, requireCallbackToken, async (req, res) => {
  const body = req.body || {};

  try {
    const job = await reportStage({
      publishId: str(body.publishId, 60).replace(/[^\w-]/g, ''),
      stage: str(body.stage, 40),
      message: str(body.message, 300),
      log: str(body.log, 20000),
      runId: str(String(body.runId ?? ''), 40).replace(/\D/g, ''),
      runUrl: str(body.runUrl, 300),
      commit: str(body.commit, 60).replace(/[^\w]/g, ''),
      trigger: str(body.trigger, 20),
    });

    return res.json({ success: true, data: { publishId: job.publishId, status: job.status } });
  } catch (error) {
    if (!error.status) console.error('Publish callback error:', error);
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Callback failed.' });
  }
});

export default router;
