import QuoteRequest from '../models/QuoteRequest.js';
import Lead from '../models/Lead.js';

/*
  Customer card: every request from the same e-mail address, plus requests
  from the same company name sent by other people, and the catalogue
  download (Lead) for that address. Sales and admin roles only.
*/

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIMIT = 200;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const clean = (value) => (typeof value === 'string' ? value.trim() : '');

// Company names compared without case and extra spaces ("Akdeniz  Gıda" = "akdeniz gıda")
const companyPattern = (company) =>
  new RegExp(`^\\s*${company.split(/\s+/).map(escapeRegex).join('\\s+')}\\s*$`, 'i');

const round = (value) => Math.round(value * 100) / 100;

export async function getCustomer(req, res) {
  try {
    const email = clean(req.query.email).toLowerCase();
    const company = clean(req.query.company).slice(0, 150);

    if (email && (email.length > 254 || !EMAIL_PATTERN.test(email))) {
      return res.status(400).json({ success: false, message: 'Geçerli bir e-posta adresi gerekli.' });
    }

    if (!email && company.length < 2) {
      return res.status(400).json({ success: false, message: 'E-posta veya firma adı gerekli.' });
    }

    const or = [];
    if (email) or.push({ email });
    if (company.length >= 2) or.push({ company: companyPattern(company) });

    const [quotes, lead] = await Promise.all([
      QuoteRequest.find({ $or: or })
        .sort({ createdAt: -1 })
        .limit(LIMIT)
        .select('company name email phone country status outcome lossReason product items quantity assignee isRead language createdAt followUpAt attribution.channel offer.currency offer.lines offer.vatRate offer.sentAt offer.revision')
        .lean(),
      email ? Lead.findOne({ email }).select('email name company country downloads createdAt lastDownloadAt marketingConsent').lean() : null,
    ]);

    const { offerTotals } = await import('../../client/src/data/offerText.js');

    const offered = new Map();
    const won = new Map();
    const add = (map, currency, value) => map.set(currency, round((map.get(currency) || 0) + value));

    const rows = quotes.map((quote) => {
      const offer = quote.offer?.lines?.length ? quote.offer : null;
      const subtotal = offer ? offerTotals(offer).subtotal : null;

      if (offer) {
        add(offered, offer.currency || 'TRY', subtotal);
        if (quote.outcome === 'won') add(won, offer.currency || 'TRY', subtotal);
      }

      return {
        _id: quote._id,
        createdAt: quote.createdAt,
        company: quote.company,
        name: quote.name,
        email: quote.email,
        country: quote.country,
        status: quote.status,
        outcome: quote.outcome || '',
        lossReason: quote.lossReason || '',
        product: quote.product || '',
        items: (quote.items || []).map((item) => ({ name: item.name, quantity: item.quantity || 1 })),
        assignee: quote.assignee || '',
        isRead: quote.isRead,
        followUpAt: quote.followUpAt || null,
        channel: quote.attribution?.channel || '',
        offer: offer ? { currency: offer.currency || 'TRY', subtotal, sentAt: offer.sentAt || null, revision: offer.revision || 1 } : null,
        // Why this request is on the card: the same address, or only the same company
        match: email && quote.email === email ? 'email' : 'company',
      };
    });

    // Contact details from the newest request with this address (else the newest one)
    const latest = rows.find((row) => row.match === 'email') || rows[0];
    const contact = quotes.find((quote) => String(quote._id) === String(latest?._id));
    const toList = (map) => [...map.entries()].map(([currency, value]) => ({ currency, value }));
    const people = new Set(rows.map((row) => row.email));

    return res.json({
      success: true,
      data: {
        customer: {
          email: email || latest?.email || '',
          name: contact?.name || lead?.name || '',
          company: contact?.company || company || lead?.company || '',
          phone: contact?.phone || '',
          country: contact?.country || lead?.country || '',
        },
        summary: {
          total: rows.length,
          open: rows.filter((row) => !row.outcome && row.status !== 'closed').length,
          won: rows.filter((row) => row.outcome === 'won').length,
          lost: rows.filter((row) => row.outcome === 'lost').length,
          firstAt: rows.at(-1)?.createdAt || null,
          lastAt: rows[0]?.createdAt || null,
          people: people.size,
          offered: toList(offered),
          wonValue: toList(won),
        },
        quotes: rows,
        lead,
        truncated: quotes.length === LIMIT,
      },
    });
  } catch (error) {
    console.error('Customer card error:', error);
    return res.status(500).json({ success: false, message: 'Müşteri bilgileri yüklenemedi.' });
  }
}

/*
  New requests after a moment, for the panel notification (polled about once
  a minute while the panel is open). Without "since" it only returns the
  server time, which the panel keeps as its starting point.
*/
export async function getRecentQuotes(req, res) {
  try {
    const now = new Date();
    const since = new Date(String(req.query.since || ''));

    if (Number.isNaN(since.getTime())) {
      return res.json({ success: true, now, data: [] });
    }

    // Never look back more than a day (a laptop that slept all night)
    const from = new Date(Math.max(since.getTime(), now.getTime() - 24 * 3600 * 1000));

    const quotes = await QuoteRequest.find({ createdAt: { $gt: from, $lte: now } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('company name country product items createdAt')
      .lean();

    return res.json({
      success: true,
      now,
      data: quotes.map((quote) => ({
        _id: quote._id,
        company: quote.company,
        name: quote.name,
        country: quote.country,
        product: quote.items?.length ? quote.items.map((item) => item.name).join(', ') : quote.product || '',
        createdAt: quote.createdAt,
      })),
    });
  } catch (error) {
    console.error('Recent quotes error:', error);
    return res.status(500).json({ success: false, message: 'Yeni talepler alınamadı.' });
  }
}
