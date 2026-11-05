import express from 'express';

import { requireAdmin, requirePermission } from '../middleware/authMiddleware.js';
import ConsentRecord from '../models/ConsentRecord.js';
import Suppression from '../models/Suppression.js';
import { audit } from '../services/audit.js';
import { withdrawConsents } from '../services/consents.js';

/*
  ADMIN (sales): the consent boxes a customer ticked on the website forms,
  and taking them back when the person asks (KVKK technical note B.4).
*/
const router = express.Router();

router.use(requireAdmin, requirePermission('sales'));

const emailOf = (value) => (typeof value === 'string' ? value.trim().toLowerCase().slice(0, 254) : '');

router.get('/', async (req, res) => {
  try {
    const email = emailOf(req.query.email);
    if (!email) return res.status(400).json({ success: false, message: 'E-mail is required.' });

    const [records, suppressed] = await Promise.all([
      ConsentRecord.find({ email }).sort({ givenAt: -1 }).limit(200).lean(),
      Suppression.exists({ type: 'email', value: email }),
    ]);

    return res.json({ success: true, data: { records, suppressed: Boolean(suppressed) } });
  } catch (error) {
    console.error('Consent list error:', error);
    return res.status(500).json({ success: false, message: 'Consents could not be loaded.' });
  }
});

router.post(
  '/withdraw',
  audit({ area: 'sales', type: 'consent', action: 'Pazarlama onaylarını geri aldı', label: (req) => emailOf(req.body?.email) }),
  async (req, res) => {
    try {
      const email = emailOf(req.body?.email);
      if (!email) return res.status(400).json({ success: false, message: 'E-mail is required.' });

      return res.json({ success: true, data: await withdrawConsents(email) });
    } catch (error) {
      console.error('Consent withdraw error:', error);
      return res.status(500).json({ success: false, message: 'Consents could not be withdrawn.' });
    }
  }
);

export default router;
