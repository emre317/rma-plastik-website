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
  resendQuoteMail,
  deleteQuoteNote,
  deleteQuoteRequest,
  saveQuoteOffer,
  sendQuoteOffer,
} from '../controllers/quoteController.js';

import {
  requireAdmin,
  requirePermission,
  requireRole,
} from '../middleware/authMiddleware.js';

import {
  quoteSubmitLimiter,
} from '../middleware/rateLimit.js';

import { offerPdfUpload } from '../middleware/upload.js';
import QuoteRequest from '../models/QuoteRequest.js';
import { audit } from '../services/audit.js';
import { quoteReference } from '../services/quoteEmail.js';
import { getTargetHistory } from '../controllers/auditController.js';
import { getCustomer, getRecentQuotes } from '../controllers/customerController.js';
import { deleteTarget, getTargets, saveTarget } from '../controllers/targetController.js';

const router = express.Router();

// Quote requests, proformas and the report: sales and admin roles
const sales = requirePermission('sales');

const STATUS = { new: 'Yeni', reviewing: 'İnceleniyor', contacted: 'İletişime Geçildi', quoted: 'Teklif Verildi', closed: 'Kapandı' };
const OUTCOME = { won: 'Kazanıldı', lost: 'Kaybedildi', '': 'Açık' };
const LOSS = {
  price: 'Fiyat', leadTime: 'Teslim Süresi', competitor: 'Rakibi Tercih Etti', noResponse: 'Yanıt Vermedi',
  specs: 'Ürün / Teknik Uymadı', postponed: 'Proje Ertelendi / İptal', other: 'Diğer',
};

const day = (value) => (value ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeZone: 'Europe/Istanbul' }).format(new Date(value)) : '');

// "Sorumlu: Ayşe · Takip: 14 Eki 2026" from the fields that were sent
function trackingDetails(req) {
  const body = req.body || {};
  const parts = [];
  if (body.assignee !== undefined) parts.push(body.assignee ? `Sorumlu: ${body.assignee}` : 'Sorumlu kaldırıldı');
  if (body.followUpAt !== undefined) parts.push(body.followUpAt ? `Takip: ${day(`${body.followUpAt}`.length === 10 ? `${body.followUpAt}T12:00:00+03:00` : body.followUpAt)}` : 'Takip tarihi silindi');
  if (body.outcome !== undefined) parts.push(`Sonuç: ${OUTCOME[body.outcome || ''] || body.outcome}`);
  if (body.lossReason !== undefined) parts.push(body.lossReason ? `Kayıp nedeni: ${LOSS[body.lossReason] || body.lossReason}` : 'Kayıp nedeni kaldırıldı');
  if (body.outcomeNote !== undefined) parts.push('Sonuç notu güncellendi');
  return parts.join(' · ');
}

// "2026-10" -> "Ekim 2026 hedefi"
const targetLabel = (req) => {
  const [year, month] = String(req.params.month || '').split('-').map(Number);
  if (!year || !month) return '';
  const owner = String(req.body?.owner || req.query?.owner || '').trim();
  return `${new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)))} hedefi${owner ? ` · ${owner}` : ' · şirket'}`;
};
const targetDetails = (req) => {
  const nf = new Intl.NumberFormat('tr-TR');
  const amounts = Array.isArray(req.body?.amounts) ? req.body.amounts : [];
  const deals = Number(req.body?.deals) || 0;
  return [...amounts.map((item) => `${nf.format(Number(item?.amount) || 0)} ${item?.currency || ''}`), deals ? `${deals} talep` : ''].filter(Boolean).join(' · ');
};

const quoteAudit = (action, details) => audit({ area: 'sales', type: 'quote', action, lookup: QuoteRequest, details });

/* PUBLIC */

router.post('/', quoteSubmitLimiter, createQuoteRequest);

/* ADMIN */

router.get('/', requireAdmin, sales, getQuoteRequests);
router.get('/stats', requireAdmin, sales, getQuoteStats);
router.get('/unread-count', requireAdmin, sales, getUnreadQuoteCount);
router.get(
  '/export',
  requireAdmin,
  sales,
  audit({ area: 'sales', type: 'quote', action: 'Teklif taleplerini Excel’e aktardı', details: (req, data, before, body) => `${body?.data?.length || 0} talep` }),
  exportQuoteRequests
);
router.get('/report', requireAdmin, sales, getQuoteReport);
router.get('/assignees', requireAdmin, sales, getQuoteAssignees);
router.get('/customer', requireAdmin, sales, getCustomer);
router.get('/recent', requireAdmin, sales, getRecentQuotes);
// Targets: everyone in sales sees them, only admins set them
router.get('/targets', requireAdmin, sales, getTargets);
router.put('/targets/:month', requireAdmin, requirePermission('settings'), audit({ area: 'sales', type: 'target', action: 'Satış hedefini kaydetti', label: targetLabel, details: targetDetails }), saveTarget);
router.delete('/targets/:month', requireAdmin, requirePermission('settings'), audit({ area: 'sales', type: 'target', action: 'Satış hedefini sildi', label: targetLabel }), deleteTarget);
router.get('/:id/history', requireAdmin, sales, (req, res) => getTargetHistory(req, res, 'quote'));
router.get('/:id', requireAdmin, sales, getQuoteRequestById);

router.patch('/:id/status', requireAdmin, sales, quoteAudit('Durumu değiştirdi', (req, data, before) => `${STATUS[before?.status] || '—'} → ${STATUS[req.body?.status] || req.body?.status}`), updateQuoteStatus);
router.patch('/:id', requireAdmin, sales, quoteAudit('Takip bilgisini güncelledi', trackingDetails), updateQuoteTracking);
router.post('/:id/resend-mail', requireAdmin, sales, quoteAudit('E-postayı yeniden gönderdi', (req) => (req.body?.kind === 'confirmation' ? 'Müşteri onayı' : 'Satış bildirimi')), resendQuoteMail);
router.post('/:id/notes', requireAdmin, sales, quoteAudit('Not ekledi', (req) => String(req.body?.text || '').slice(0, 160)), addQuoteNote);
// Deleting a request: admin role only (sales can close it, not remove it)
router.delete('/:id', requireAdmin, requireRole('admin'), quoteAudit('Teklif talebini sildi', (req, data, before) => (before ? `${quoteReference(before._id)} · ${[before.name, before.email, before.country].filter(Boolean).join(' · ')}` : '')), deleteQuoteRequest);
router.delete('/:id/notes/:noteId', requireAdmin, sales, quoteAudit('Not sildi'), deleteQuoteNote);
router.put('/:id/offer', requireAdmin, sales, quoteAudit('Proformayı kaydetti', (req, data) => (data?.offer ? `R${data.offer.revision} · ${data.offer.lines?.length || 0} satır · ${data.offer.currency}` : '')), saveQuoteOffer);
router.post('/:id/offer/send', requireAdmin, sales, offerPdfUpload, quoteAudit('Proformayı e-postayla gönderdi', (req, data) => (data?.offer?.sentTo ? `Alıcı: ${data.offer.sentTo}` : '')), sendQuoteOffer);

export default router;
