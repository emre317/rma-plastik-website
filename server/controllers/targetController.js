import QuoteRequest, { OFFER_CURRENCIES } from '../models/QuoteRequest.js';
import SalesTarget from '../models/SalesTarget.js';

/*
  Monthly sales targets and what was won in each month. A request counts in
  the month it was marked "Kazanıldı" (Istanbul time); the amount is its
  proforma without VAT.
*/

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const ZONE = 'Europe/Istanbul';
const round = (value) => Math.round(value * 100) / 100;

// "2026-10" in Istanbul -> UTC instant of its first moment (Türkiye is UTC+3 all year)
const monthStart = (month) => new Date(`${month}-01T00:00:00+03:00`);

function nextMonth(month) {
  const [year, number] = month.split('-').map(Number);
  return number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, '0')}`;
}

function currentMonth() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);
}

function monthsBetween(from, to) {
  const months = [];
  for (let month = from; month <= to && months.length < 36; month = nextMonth(month)) months.push(month);
  return months;
}

export async function getTargets(req, res) {
  try {
    const now = currentMonth();
    const to = MONTH.test(req.query.to || '') ? req.query.to : now;
    const from = MONTH.test(req.query.from || '') && req.query.from <= to ? req.query.from : to.slice(0, 4) + '-01';
    const months = monthsBetween(from, to);

    const [targets, won] = await Promise.all([
      SalesTarget.find({ month: { $in: months } }).lean(),
      QuoteRequest.find({
        outcome: 'won',
        outcomeAt: { $gte: monthStart(months[0]), $lt: monthStart(nextMonth(months.at(-1))) },
      })
        .select('outcomeAt offer.currency offer.lines offer.vatRate')
        .lean(),
    ]);

    const { offerTotals } = await import('../../client/src/data/offerText.js');
    const monthOf = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit' }).format(date).slice(0, 7);

    const rows = new Map(months.map((month) => [month, { month, target: null, won: 0, wonWithOffer: 0, byCurrency: {} }]));

    for (const quote of won) {
      const row = rows.get(monthOf(quote.outcomeAt));
      if (!row) continue;
      row.won += 1;
      if (quote.offer?.lines?.length) {
        const currency = quote.offer.currency || 'TRY';
        row.wonWithOffer += 1;
        row.byCurrency[currency] = round((row.byCurrency[currency] || 0) + offerTotals(quote.offer).subtotal);
      }
    }

    for (const target of targets) {
      const row = rows.get(target.month);
      if (row) row.target = { currency: target.currency, amount: target.amount, deals: target.deals, updatedBy: target.updatedBy, updatedAt: target.updatedAt };
    }

    return res.json({
      success: true,
      data: [...rows.values()].map((row) => ({
        ...row,
        byCurrency: Object.entries(row.byCurrency).map(([currency, value]) => ({ currency, value })),
        achieved: row.target ? row.byCurrency[row.target.currency] || 0 : null,
      })),
      currentMonth: now,
    });
  } catch (error) {
    console.error('Sales targets error:', error);
    return res.status(500).json({ success: false, message: 'Satış hedefleri yüklenemedi.' });
  }
}

export async function saveTarget(req, res) {
  try {
    const { month } = req.params;
    if (!MONTH.test(month)) return res.status(400).json({ success: false, message: 'Ay YYYY-AA biçiminde olmalı.' });

    const currency = String(req.body?.currency || '');
    const amount = Number(req.body?.amount);
    const deals = req.body?.deals === '' || req.body?.deals === undefined || req.body?.deals === null ? 0 : Number(req.body.deals);

    if (!OFFER_CURRENCIES.includes(currency)) return res.status(400).json({ success: false, message: 'Para birimi TRY, USD veya EUR olmalı.' });
    if (!Number.isFinite(amount) || amount < 0 || amount > 1e11) return res.status(400).json({ success: false, message: 'Geçerli bir hedef tutarı yazın.' });
    if (!Number.isInteger(deals) || deals < 0 || deals > 100000) return res.status(400).json({ success: false, message: 'Kazanılacak talep sayısı tam sayı olmalı.' });
    if (amount === 0 && deals === 0) return res.status(400).json({ success: false, message: 'Tutar veya talep sayısından en az birini yazın.' });

    const target = await SalesTarget.findOneAndUpdate(
      { month },
      { $set: { currency, amount: round(amount), deals, updatedBy: req.admin?.name || req.admin?.email || '' } },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    return res.json({ success: true, data: target });
  } catch (error) {
    console.error('Save target error:', error);
    return res.status(500).json({ success: false, message: 'Hedef kaydedilemedi.' });
  }
}

export async function deleteTarget(req, res) {
  try {
    const { month } = req.params;
    if (!MONTH.test(month)) return res.status(400).json({ success: false, message: 'Ay YYYY-AA biçiminde olmalı.' });
    const result = await SalesTarget.deleteOne({ month });
    if (!result.deletedCount) return res.status(404).json({ success: false, message: 'Bu ay için hedef yok.' });
    return res.json({ success: true, data: { month } });
  } catch (error) {
    console.error('Delete target error:', error);
    return res.status(500).json({ success: false, message: 'Hedef silinemedi.' });
  }
}
