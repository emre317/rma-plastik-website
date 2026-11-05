import express from 'express';

import {
  cancelMeeting,
  checkMeetingConflicts,
  createMeetingBlock,
  deleteMeetingBlock,
  listMeetingBlocks,
  meetingAvailability,
  confirmMeeting,
  convertMeetingToQuote,
  meetingOutcomeText,
  saveMeetingResult,
  createMeeting,
  deleteMeeting,
  getMeeting,
  listMeetingStaff,
  listMeetings,
  meetingConfig,
  meetingLogLine,
  meetingSummary,
  updateMeetingNote,
} from '../controllers/meetingController.js';
import { requireAdmin, requirePermission, requireRole } from '../middleware/authMiddleware.js';
import { availabilityLimiter, meetingSubmitLimiter } from '../middleware/rateLimit.js';
import Meeting from '../models/Meeting.js';
import { audit } from '../services/audit.js';
import { meetingReference } from '../services/meetingEmail.js';

/*
  Meeting requests (Toplantı Talepleri)
    POST /api/meetings              website form (public, rate limited)
    everything else                 panel, sales and admin roles
*/
const router = express.Router();
const sales = requirePermission('sales');

const meetingAudit = (action, details) => audit({ area: 'sales', type: 'meeting', action, lookup: Meeting, details });

router.post('/', meetingSubmitLimiter, createMeeting);
router.get('/availability', availabilityLimiter, meetingAvailability);

router.get('/', requireAdmin, sales, listMeetings);
router.get('/summary', requireAdmin, sales, meetingSummary);
router.get('/config', requireAdmin, sales, meetingConfig);
router.get('/staff', requireAdmin, sales, listMeetingStaff);
router.get('/blocks', requireAdmin, sales, listMeetingBlocks);
router.post('/blocks', requireAdmin, sales, audit({ area: 'sales', type: 'meeting', action: 'Toplantılara kapalı zaman ekledi', details: (req) => [req.body?.from, req.body?.to, req.body?.note].filter(Boolean).join(' · ') }), createMeetingBlock);
router.delete('/blocks/:blockId', requireAdmin, sales, audit({ area: 'sales', type: 'meeting', action: 'Kapalı zamanı kaldırdı' }), deleteMeetingBlock);
router.get('/:id', requireAdmin, sales, getMeeting);

router.post(
  '/:id/confirm',
  requireAdmin,
  sales,
  meetingAudit(
    (req, data, before) => (before?.status === 'confirmed' ? 'Toplantıyı güncelledi' : 'Toplantıyı onayladı'),
    (req, data) => (data ? `${meetingLogLine(data)} · ${(data.staff || []).map((person) => person.name).join(', ')}` : '')
  ),
  confirmMeeting
);
router.post(
  '/:id/cancel',
  requireAdmin,
  sales,
  meetingAudit((req, data, before) => (before?.status === 'confirmed' ? 'Toplantıyı iptal etti' : 'Toplantı talebini reddetti'), (req, data, before) => meetingLogLine(before)),
  cancelMeeting
);
router.post('/:id/check', requireAdmin, sales, checkMeetingConflicts);
router.post('/:id/result', requireAdmin, sales, meetingAudit('Görüşme sonucunu girdi', (req) => meetingOutcomeText(req.body?.outcome)), saveMeetingResult);
router.post(
  '/:id/quote',
  requireAdmin,
  sales,
  meetingAudit('Toplantıyı teklif talebine dönüştürdü', (req, data) => (data?.quoteId ? `RMA-${String(data.quoteId).slice(-6).toUpperCase()}` : '')),
  convertMeetingToQuote
);
router.patch('/:id', requireAdmin, sales, meetingAudit('Toplantı notunu güncelledi'), updateMeetingNote);
router.delete(
  '/:id',
  requireAdmin,
  requireRole('admin'),
  meetingAudit('Toplantı kaydını sildi', (req, data, before) => (before ? `${meetingReference(before._id)} · ${before.email}` : '')),
  deleteMeeting
);

export default router;
