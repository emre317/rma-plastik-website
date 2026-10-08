import mongoose from 'mongoose';

import QuoteRequest, {
  OFFER_CURRENCIES,
  QUOTE_LANGUAGES,
  QUOTE_STATUSES,
} from '../models/QuoteRequest.js';
import { getSiteSettings } from '../models/SiteSettings.js';
import { isMailConfigured } from '../services/mailer.js';
import {
  isCustomerConfirmationEnabled,
  quoteReference,
  sendOfferEmail,
  sendQuoteConfirmation,
  sendQuoteNotification,
} from '../services/quoteEmail.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const OPTIONAL_FIELD_LIMITS = {
  phone: 40,
  country: 80,
  product: 150,
  productDetails: 600,
  capacity: 80,
  application: 200,
};

function cleanString(value) {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function escapeRegex(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
}

function parsePositiveInt(value, fallback) {
  const number = Number.parseInt(value, 10);

  return Number.isFinite(number) && number > 0
    ? number
    : fallback;
}

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

function notFound(res) {
  return res.status(404).json({
    success: false,
    message: 'Quote request not found.',
  });
}

export async function createQuoteRequest(req, res) {
  try {
    const body = req.body || {};

    const company = cleanString(body.company);
    const name = cleanString(body.name);
    const email = cleanString(body.email).toLowerCase();
    const message = cleanString(body.message);

    if (!company || !name || !email || !message) {
      return res.status(400).json({
        success: false,
        message:
          'Please complete all required fields.',
      });
    }

    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({
        success: false,
        message:
          'Please enter a valid email address.',
      });
    }

    const optional = {};

    for (const [field, maxLength] of Object.entries(
      OPTIONAL_FIELD_LIMITS
    )) {
      const value = cleanString(body[field]);

      if (value.length > maxLength) {
        return res.status(400).json({
          success: false,
          message: `${field} must be at most ${maxLength} characters.`,
        });
      }

      optional[field] = value;
    }

    // Only site images (e.g. /images/products/rd-200.webp) are kept
    const siteImage = (value) => {
      const image = cleanString(value);
      return /^\/(images|uploads)\/[\w./-]{1,280}$/.test(image) && !image.includes('..') ? image : '';
    };

    optional.productImage = siteImage(body.productImage);

    // Quote cart: up to 30 models with quantities
    optional.items = (Array.isArray(body.items) ? body.items : [])
      .slice(0, 30)
      .map((item) => ({
        name: cleanString(item?.name).slice(0, 150),
        details: cleanString(item?.details).slice(0, 600),
        image: siteImage(item?.image),
        quantity: Math.min(99999, Math.max(1, Number.parseInt(item?.quantity, 10) || 1)),
      }))
      .filter((item) => item.name);

    let quantity = null;

    if (
      body.quantity !== undefined &&
      body.quantity !== null &&
      body.quantity !== ''
    ) {
      quantity = Number(body.quantity);

      if (
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Quantity must be a whole number greater than zero.',
        });
      }
    }

    // Unknown values are ignored rather than rejected
    const language = QUOTE_LANGUAGES.includes(body.language)
      ? body.language
      : '';

    const quoteRequest =
      await QuoteRequest.create({
        company,
        name,
        email,
        ...optional,
        quantity,
        message,
        language,
      });

    // Email the sales team; a mail failure must not fail the request
    sendQuoteNotification(quoteRequest).catch((error) => {
      console.error('Quote notification email error:', error);
    });

    // Receipt with the reference number for the customer, in the site language
    const confirmation = isMailConfigured() && isCustomerConfirmationEnabled();

    if (confirmation) {
      getSiteSettings()
        .catch(() => ({}))
        .then((settings) => sendQuoteConfirmation(quoteRequest, settings || {}))
        .catch((error) => {
          console.error('Quote confirmation email error:', error);
        });
    }

    return res.status(201).json({
      success: true,

      message:
        'Quote request received successfully.',

      requestId: quoteRequest._id,

      reference: quoteReference(quoteRequest._id),

      confirmation,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({
        success: false,
        message:
          'Please check the submitted information.',
      });
    }

    console.error(
      'Create quote error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Quote request could not be submitted.',
    });
  }
}

// Istanbul has no DST (UTC+3): end of the current day there
function endOfTodayIstanbul() {
  const now = new Date(Date.now() + 3 * 3600 * 1000);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999) - 3 * 3600 * 1000);
}

// "2026-03-01" -> start (or end) of that day in Istanbul
function parseDay(value, endOfDay = false) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dueFilter() {
  return {
    followUpAt: { $ne: null, $lte: endOfTodayIstanbul() },
    status: { $ne: 'closed' },
  };
}

/* Filters shared by the list, the Excel export and the report */
function buildFilter(query = {}) {
  const filter = {};
  const { status } = query;

  if (typeof status === 'string' && status) {
    if (!QUOTE_STATUSES.includes(status)) {
      return { error: 'Invalid status.' };
    }

    filter.status = status;
  }

  const assignee = cleanString(query.assignee).slice(0, 80);

  // "-" = unassigned; requests saved before this field existed have no assignee at all
  if (assignee === '-') filter.assignee = { $in: ['', null] };
  else if (assignee) filter.assignee = assignee;

  if (query.followUp === 'due') Object.assign(filter, dueFilter(), filter.status ? { status: filter.status } : {});

  const from = parseDay(query.from);
  const to = parseDay(query.to, true);

  if (from || to) {
    filter.createdAt = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    };
  }

  const searchTerm = cleanString(query.search).slice(0, 100);

  if (searchTerm) {
    const pattern = new RegExp(
      escapeRegex(searchTerm),
      'i'
    );

    filter.$or = [
      'company',
      'name',
      'email',
      'product',
      'country',
      'items.name',
    ].map((field) => ({
      [field]: pattern,
    }));
  }

  return { filter };
}

export async function getQuoteRequests(
  req,
  res
) {
  try {
    const { filter, error } = buildFilter(req.query);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const currentPage = parsePositiveInt(
      req.query.page,
      1
    );

    const pageLimit = Math.min(
      parsePositiveInt(req.query.limit, 20),
      100
    );

    const skip =
      (currentPage - 1) * pageLimit;

    const [
      quotes,
      total,
    ] = await Promise.all([
      QuoteRequest.find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(pageLimit)
        .select('-notes'),

      QuoteRequest.countDocuments(
        filter
      ),
    ]);

    return res.json({
      success: true,

      data: quotes,

      pagination: {
        page: currentPage,
        limit: pageLimit,
        total,
        pages: Math.max(
          Math.ceil(total / pageLimit),
          1
        ),
      },
    });
  } catch (error) {
    console.error(
      'Get quotes error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Quote requests could not be loaded.',
    });
  }
}

const EXPORT_LIMIT = 5000;

/* All requests matching the list filters (newest first) for the Excel file */
export async function exportQuoteRequests(req, res) {
  try {
    const { filter, error } = buildFilter(req.query);

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const quotes = await QuoteRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(EXPORT_LIMIT)
      .lean();

    return res.json({
      success: true,
      data: quotes,
      truncated: quotes.length === EXPORT_LIMIT,
    });
  } catch (error) {
    console.error('Export quotes error:', error);

    return res.status(500).json({
      success: false,
      message: 'Quote requests could not be exported.',
    });
  }
}

const UNKNOWN = 'Belirtilmemiş';

/* Counts by month, country, product, status and assignee for a date range */
export async function getQuoteReport(req, res) {
  try {
    const { filter, error } = buildFilter({ from: req.query.from, to: req.query.to });

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const [result] = await QuoteRequest.aggregate([
      { $match: filter },
      {
        $facet: {
          total: [{ $count: 'count' }],

          byMonth: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'Europe/Istanbul' } },
                count: { $sum: 1 },
                quoted: { $sum: { $cond: [{ $in: ['$status', ['quoted', 'closed']] }, 1, 0] } },
              },
            },
            { $sort: { _id: 1 } },
          ],

          byCountry: [
            { $group: { _id: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$country', ''] } }, 0] }, '$country', UNKNOWN] }, count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } },
          ],

          // Cart items; a request without items counts its product / subject once
          byProduct: [
            {
              $project: {
                lines: {
                  $cond: [
                    { $gt: [{ $size: { $ifNull: ['$items', []] } }, 0] },
                    '$items',
                    [{
                      name: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$product', ''] } }, 0] }, '$product', 'Genel talep'] },
                      quantity: { $ifNull: ['$quantity', 1] },
                    }],
                  ],
                },
              },
            },
            { $unwind: '$lines' },
            {
              $group: {
                _id: '$lines.name',
                requests: { $sum: 1 },
                pieces: { $sum: { $ifNull: ['$lines.quantity', 1] } },
              },
            },
            { $sort: { requests: -1, pieces: -1, _id: 1 } },
          ],

          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],

          byAssignee: [
            {
              $group: {
                _id: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$assignee', ''] } }, 0] }, '$assignee', ''] },
                count: { $sum: 1 },
                open: { $sum: { $cond: [{ $ne: ['$status', 'closed'] }, 1, 0] } },
              },
            },
            { $sort: { count: -1 } },
          ],

          byLanguage: [{ $group: { _id: '$language', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        },
      },
    ]);

    const rename = (list, map) => list.map(({ _id, ...rest }) => ({ ...map(_id), ...rest }));

    return res.json({
      success: true,
      data: {
        total: result.total[0]?.count || 0,
        byMonth: rename(result.byMonth, (month) => ({ month })),
        byCountry: rename(result.byCountry, (country) => ({ country })),
        byProduct: rename(result.byProduct, (name) => ({ name })),
        byStatus: rename(result.byStatus, (status) => ({ status })),
        byAssignee: rename(result.byAssignee, (assignee) => ({ assignee })),
        byLanguage: rename(result.byLanguage, (language) => ({ language: language || '' })),
      },
    });
  } catch (error) {
    console.error('Quote report error:', error);

    return res.status(500).json({
      success: false,
      message: 'Report could not be loaded.',
    });
  }
}

/* Names already used as assignee (suggestions in the admin) */
export async function getQuoteAssignees(req, res) {
  try {
    const names = await QuoteRequest.distinct('assignee', { assignee: { $ne: '' } });

    return res.json({
      success: true,
      data: names.sort((a, b) => a.localeCompare(b, 'tr')),
    });
  } catch (error) {
    console.error('Quote assignees error:', error);

    return res.status(500).json({
      success: false,
      message: 'Assignees could not be loaded.',
    });
  }
}


export async function getQuoteRequestById(
  req,
  res
) {
  try {
    if (!isValidId(req.params.id)) {
      return notFound(res);
    }

    const quote =
      await QuoteRequest.findById(
        req.params.id
      );

    if (!quote) {
      return notFound(res);
    }

    if (!quote.isRead) {
      quote.isRead = true;
      await quote.save();
    }

    return res.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    console.error(
      'Get quote error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Quote request could not be loaded.',
    });
  }
}


export async function updateQuoteStatus(
  req,
  res
) {
  try {
    const {
      status,
    } = req.body || {};

    if (
      !QUOTE_STATUSES.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status.',
      });
    }

    if (!isValidId(req.params.id)) {
      return notFound(res);
    }

    const quote =
      await QuoteRequest.findByIdAndUpdate(
        req.params.id,

        {
          status,
        },

        {
          returnDocument: 'after',
          runValidators: true,
        }
      );

    if (!quote) {
      return notFound(res);
    }

    return res.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    console.error(
      'Update quote status error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Status could not be updated.',
    });
  }
}


/* Assignee and follow-up date (both optional, "" / null clears them) */
export async function updateQuoteTracking(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return notFound(res);
    }

    const body = req.body || {};
    const update = {};

    if (body.assignee !== undefined) {
      update.assignee = cleanString(body.assignee).slice(0, 80);
    }

    if (body.followUpAt !== undefined) {
      if (body.followUpAt === null || body.followUpAt === '') {
        update.followUpAt = null;
      } else {
        const date = parseDay(body.followUpAt, false) || new Date(body.followUpAt);

        if (Number.isNaN(date.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid follow-up date.' });
        }

        update.followUpAt = date;
      }
    }

    const quote = await QuoteRequest.findByIdAndUpdate(req.params.id, update, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!quote) {
      return notFound(res);
    }

    return res.json({ success: true, data: quote });
  } catch (error) {
    console.error('Update quote tracking error:', error);

    return res.status(500).json({
      success: false,
      message: 'Quote request could not be updated.',
    });
  }
}

export async function addQuoteNote(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return notFound(res);
    }

    const text = cleanString(req.body?.text);

    if (!text) {
      return res.status(400).json({ success: false, message: 'Note is empty.' });
    }

    if (text.length > 2000) {
      return res.status(400).json({ success: false, message: 'Note must be at most 2000 characters.' });
    }

    const quote = await QuoteRequest.findByIdAndUpdate(
      req.params.id,
      { $push: { notes: { text, author: req.admin?.name || req.admin?.email || '' } } },
      { returnDocument: 'after', runValidators: true }
    );

    if (!quote) {
      return notFound(res);
    }

    return res.status(201).json({ success: true, data: quote });
  } catch (error) {
    console.error('Add quote note error:', error);

    return res.status(500).json({
      success: false,
      message: 'Note could not be saved.',
    });
  }
}

export async function deleteQuoteNote(req, res) {
  try {
    if (!isValidId(req.params.id) || !isValidId(req.params.noteId)) {
      return notFound(res);
    }

    const quote = await QuoteRequest.findByIdAndUpdate(
      req.params.id,
      { $pull: { notes: { _id: req.params.noteId } } },
      { returnDocument: 'after' }
    );

    if (!quote) {
      return notFound(res);
    }

    return res.json({ success: true, data: quote });
  } catch (error) {
    console.error('Delete quote note error:', error);

    return res.status(500).json({
      success: false,
      message: 'Note could not be deleted.',
    });
  }
}


/* ---------- Commercial offer (Teklif) ---------- */

const num = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

function offerPayload(body = {}) {
  const lines = (Array.isArray(body.lines) ? body.lines : [])
    .slice(0, 60)
    .map((line) => ({
      name: cleanString(line?.name).slice(0, 200),
      details: cleanString(line?.details).slice(0, 600),
      quantity: num(line?.quantity, 0, 1000000, 1),
      unit: cleanString(line?.unit).slice(0, 20),
      unitPrice: num(line?.unitPrice, 0, 1e10, 0),
      discount: num(line?.discount, 0, 100, 0),
    }))
    .filter((line) => line.name);

  const vat = body.vatRate === null || body.vatRate === undefined || body.vatRate === '' ? null : num(body.vatRate, 0, 100, null);

  return {
    language: QUOTE_LANGUAGES.includes(body.language) ? body.language : 'tr',
    currency: OFFER_CURRENCIES.includes(body.currency) ? body.currency : 'TRY',
    lines,
    vatRate: vat,
    incoterm: cleanString(body.incoterm).slice(0, 20),
    deliveryPlace: cleanString(body.deliveryPlace).slice(0, 160),
    deliveryTime: cleanString(body.deliveryTime).slice(0, 160),
    paymentTerms: cleanString(body.paymentTerms).slice(0, 300),
    validUntil: parseDay(body.validUntil) || null,
    notes: cleanString(body.notes).slice(0, 2000),
    terms: cleanString(body.terms).slice(0, 3000),
    preparedBy: cleanString(body.preparedBy).slice(0, 120),
  };
}

/* Save the offer; editing an offer that was already sent starts a new revision */
export async function saveQuoteOffer(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return notFound(res);
    }

    const quote = await QuoteRequest.findById(req.params.id);

    if (!quote) {
      return notFound(res);
    }

    const data = offerPayload(req.body);

    if (!data.lines.length) {
      return res.status(400).json({ success: false, message: 'Proformaya en az bir ürün satırı ekleyin.' });
    }

    const previous = quote.offer;
    const revision = previous ? (previous.sentAt ? (previous.revision || 1) + 1 : previous.revision || 1) : 1;

    quote.offer = {
      ...data,
      revision,
      savedAt: new Date(),
      // Earlier sends stay in the internal notes
      sentAt: null,
      sentTo: '',
    };

    await quote.save();

    return res.json({ success: true, data: quote });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, message: 'Proforma bilgilerini kontrol edin.' });
    }

    console.error('Save offer error:', error);

    return res.status(500).json({ success: false, message: 'Proforma kaydedilemedi.' });
  }
}

/* E-mail the saved offer to the customer with the PDF made in the admin panel */
export async function sendQuoteOffer(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return notFound(res);
    }

    if (!isMailConfigured()) {
      return res.status(400).json({ success: false, message: 'E-posta (SMTP) ayarlı değil; PDF’i indirip kendiniz gönderin.' });
    }

    const pdf = req.file?.buffer;

    if (!pdf || pdf.subarray(0, 5).toString('latin1') !== '%PDF-') {
      return res.status(400).json({ success: false, message: 'Proforma PDF’i oluşturulamadı.' });
    }

    const quote = await QuoteRequest.findById(req.params.id);

    if (!quote) {
      return notFound(res);
    }

    if (!quote.offer?.lines?.length || !quote.offer.savedAt) {
      return res.status(400).json({ success: false, message: 'Önce proformayı kaydedin.' });
    }

    const settings = await getSiteSettings().catch(() => ({}));
    const { number, total } = await sendOfferEmail(quote, quote.offer, settings || {}, pdf);

    quote.offer.sentAt = new Date();
    quote.offer.sentTo = quote.email;

    if (!['quoted', 'closed'].includes(quote.status)) {
      quote.status = 'quoted';
    }

    quote.notes.push({
      text: `Proforma fatura ${number} e-postayla gönderildi (${quote.email}). Toplam: ${total}`,
      author: req.admin?.name || req.admin?.email || '',
    });

    await quote.save();

    return res.json({ success: true, data: quote });
  } catch (error) {
    console.error('Send offer error:', error);

    return res.status(500).json({ success: false, message: 'Proforma e-postası gönderilemedi.' });
  }
}


export async function getQuoteStats(
  req,
  res
) {
  try {
    const [
      results,
      unread,
      total,
      due,
    ] = await Promise.all([
      QuoteRequest.aggregate([
        {
          $group: {
            _id: '$status',
            count: {
              $sum: 1,
            },
          },
        },
      ]),

      QuoteRequest.countDocuments({
        isRead: false,
      }),

      QuoteRequest.countDocuments(),

      QuoteRequest.countDocuments(dueFilter()),
    ]);

    const stats = {
      total,
      unread,
      due,
    };

    QUOTE_STATUSES.forEach((status) => {
      stats[status] = 0;
    });

    results.forEach((item) => {
      if (QUOTE_STATUSES.includes(item._id)) {
        stats[item._id] = item.count;
      }
    });

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error(
      'Get quote stats error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Statistics could not be loaded.',
    });
  }
}

export async function getUnreadQuoteCount(req, res) {
  try {
    const unread = await QuoteRequest.countDocuments({
      isRead: false,
    });

    return res.json({
      success: true,
      data: {
        unread,
      },
    });
  } catch (error) {
    console.error(
      'Unread count error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unread count could not be loaded.',
    });
  }
}
