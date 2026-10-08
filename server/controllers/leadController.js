import mongoose from 'mongoose';

import Lead from '../models/Lead.js';
import QuoteRequest, { QUOTE_LANGUAGES } from '../models/QuoteRequest.js';
import { cleanAttribution } from '../services/attribution.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The published catalogue (client/public/files)
export const CATALOG_URL = '/files/rma-plastik-katalog-2025.pdf';

const clean = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* PUBLIC: e-mail (required), name, company, country -> catalogue link */
export async function createCatalogLead(req, res) {
  try {
    const body = req.body || {};
    const email = clean(body.email, 254).toLowerCase();

    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    // Hidden field: filled in only by bots
    if (clean(body.website, 200)) {
      return res.status(201).json({ success: true, url: CATALOG_URL });
    }

    const now = new Date();
    const marketingConsent = body.marketingConsent === true;

    const details = {
      name: clean(body.name, 120),
      company: clean(body.company, 150),
      country: clean(body.country, 80),
      language: QUOTE_LANGUAGES.includes(body.language) ? body.language : '',
    };

    // Empty fields of a repeat download do not wipe earlier answers
    const set = Object.fromEntries(Object.entries(details).filter(([, value]) => value));
    set.lastDownloadAt = now;
    set.isRead = false;

    if (marketingConsent) {
      set.marketingConsent = true;
      set.consentAt = now;
    }

    await Lead.findOneAndUpdate(
      { email },
      {
        $set: set,
        $inc: { downloads: 1 },
        $setOnInsert: { source: 'catalog', attribution: cleanAttribution(body.attribution) },
      },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({ success: true, url: CATALOG_URL });
  } catch (error) {
    if (error?.code === 11000) {
      // Two downloads at the same moment: the record exists, the link is still valid
      return res.status(201).json({ success: true, url: CATALOG_URL });
    }

    console.error('Catalog lead error:', error);
    return res.status(500).json({ success: false, message: 'Request could not be completed.' });
  }
}

function leadFilter(query = {}) {
  const filter = {};
  const search = clean(query.search, 100);

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = ['email', 'name', 'company', 'country'].map((field) => ({ [field]: pattern }));
  }

  if (query.consent === 'yes') filter.marketingConsent = true;

  return filter;
}

// Adds "quotes": how many quote requests came from the same e-mail
async function withQuotes(leads) {
  const emails = leads.map((lead) => lead.email);
  if (!emails.length) return leads;

  const counts = await QuoteRequest.aggregate([
    { $match: { email: { $in: emails } } },
    { $sort: { createdAt: 1 } },
    { $group: { _id: '$email', count: { $sum: 1 }, lastId: { $last: '$_id' } } },
  ]);

  const byEmail = new Map(counts.map((row) => [row._id, row]));

  return leads.map((lead) => ({
    ...lead,
    quotes: byEmail.get(lead.email)?.count || 0,
    lastQuoteId: byEmail.get(lead.email)?.lastId || null,
  }));
}

/* ADMIN: paged list (newest download first) */
export async function getLeads(req, res) {
  try {
    const filter = leadFilter(req.query);
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);

    const [leads, total, unread] = await Promise.all([
      Lead.find(filter).sort({ lastDownloadAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Lead.countDocuments(filter),
      Lead.countDocuments({ isRead: false }),
    ]);

    return res.json({
      success: true,
      data: await withQuotes(leads),
      unread,
      pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
    });
  } catch (error) {
    console.error('Get leads error:', error);
    return res.status(500).json({ success: false, message: 'Leads could not be loaded.' });
  }
}

export async function exportLeads(req, res) {
  try {
    const leads = await Lead.find(leadFilter(req.query)).sort({ lastDownloadAt: -1 }).limit(5000).lean();
    return res.json({ success: true, data: await withQuotes(leads) });
  } catch (error) {
    console.error('Export leads error:', error);
    return res.status(500).json({ success: false, message: 'Leads could not be exported.' });
  }
}

export async function getUnreadLeadCount(req, res) {
  try {
    return res.json({ success: true, data: { unread: await Lead.countDocuments({ isRead: false }) } });
  } catch (error) {
    console.error('Lead count error:', error);
    return res.status(500).json({ success: false, message: 'Count could not be loaded.' });
  }
}

/* Opening the list marks everything as seen */
export async function markLeadsRead(req, res) {
  try {
    await Lead.updateMany({ isRead: false }, { isRead: true });
    return res.json({ success: true });
  } catch (error) {
    console.error('Mark leads read error:', error);
    return res.status(500).json({ success: false, message: 'Leads could not be updated.' });
  }
}

/* Removes the person's data (e.g. on request under KVKK / GDPR) */
export async function deleteLead(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    const lead = await Lead.findByIdAndDelete(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete lead error:', error);
    return res.status(500).json({ success: false, message: 'Lead could not be deleted.' });
  }
}
