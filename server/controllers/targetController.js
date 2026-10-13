import AdminUser from '../models/AdminUser.js';
import QuoteRequest, { OFFER_CURRENCIES } from '../models/QuoteRequest.js';
import SalesTarget, { syncTargetIndexes } from '../models/SalesTarget.js';

/*
  Monthly sales targets and what was won in each month. A request counts in
  the month it was marked "Kazanıldı" (Istanbul time); the amount is its
  proforma without VAT. The company target counts every won request; a
  person's target counts the won requests where they are "Sorumlu".
*/

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const ZONE = 'Europe/Istanbul';
const round = (value) => Math.round(value * 100) / 100;

// "2026-10" in Istanbul -> UTC instant of its first moment (Türkiye is UTC+3 all year)
const monthStart = (month) => new Date(`${month}-01T00:00:00+03:00`);
const monthOf = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit' }).format(date).slice(0, 7);

// Names compared without case and extra spaces ("ayşe  yılmaz" = "Ayşe Yılmaz")
const nameKey = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr');
const cleanOwner = (value) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, 120);

function nextMonth(month) {
  const [year, number] = month.split('-').map(Number);
  return number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, '0')}`;
}

const currentMonth = () => monthOf(new Date());

function monthsBetween(from, to) {
  const months = [];
  for (let month = from; month <= to && months.length < 36; month = nextMonth(month)) months.push(month);
  return months;
}

// Targets saved before several currencies were possible had one currency and amount
function targetView(target) {
  const amounts = target.amounts?.length
    ? target.amounts
    : target.currency && target.amount ? [{ currency: target.currency, amount: target.amount }] : [];
  return {
    owner: target.owner || '',
    amounts: amounts.map(({ currency, amount }) => ({ currency, amount })),
    deals: target.deals || 0,
    updatedBy: target.updatedBy,
    updatedAt: target.updatedAt,
  };
}

/* Won requests between two months: [{ month, assignee, currency, value }] */
async function wonBetween(first, last) {
  const quotes = await QuoteRequest.find({
    outcome: 'won',
    outcomeAt: { $gte: monthStart(first), $lt: monthStart(nextMonth(last)) },
  })
    .select('outcomeAt assignee offer.currency offer.lines offer.vatRate')
    .lean();

  const { offerTotals } = await import('../../client/src/data/offerText.js');

  return quotes.map((quote) => {
    const offer = quote.offer?.lines?.length ? quote.offer : null;
    return {
      month: monthOf(quote.outcomeAt),
      assignee: nameKey(quote.assignee),
      currency: offer ? offer.currency || 'TRY' : '',
      value: offer ? offerTotals(offer).subtotal : 0,
    };
  });
}

/* A month's figures for one target (or none): won count, won per currency, progress per targeted currency */
function monthFigures(month, wins, target) {
  const byCurrency = {};
  let won = 0;
  for (const win of wins) {
    if (win.month !== month) continue;
    won += 1;
    if (win.currency) byCurrency[win.currency] = round((byCurrency[win.currency] || 0) + win.value);
  }
  const view = target ? targetView(target) : null;
  return {
    month,
    target: view,
    won,
    byCurrency: Object.entries(byCurrency).map(([currency, value]) => ({ currency, value })),
    achieved: view ? view.amounts.map(({ currency, amount }) => ({ currency, amount, value: byCurrency[currency] || 0 })) : [],
  };
}

/* People who can have a target: active sales/admin users, names used as "Sorumlu", existing target owners */
async function ownerOptions() {
  const [users, assignees, owners] = await Promise.all([
    AdminUser.find({ isActive: true, role: { $in: ['admin', 'sales'] } }).select('name').lean(),
    QuoteRequest.distinct('assignee', { assignee: { $ne: '' } }),
    SalesTarget.distinct('owner', { owner: { $ne: '' } }),
  ]);
  const names = new Map();
  for (const name of [...users.map((user) => user.name), ...assignees, ...owners]) {
    const clean = cleanOwner(name);
    if (clean && !names.has(nameKey(clean))) names.set(nameKey(clean), clean);
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b, 'tr'));
}

export async function getTargets(req, res) {
  try {
    await syncTargetIndexes();
    const now = currentMonth();
    const to = MONTH.test(req.query.to || '') ? req.query.to : now;
    const from = MONTH.test(req.query.from || '') && req.query.from <= to ? req.query.from : to.slice(0, 4) + '-01';
    const months = monthsBetween(from, to);
    const owner = cleanOwner(req.query.owner);

    const [targets, wins, owners] = await Promise.all([
      SalesTarget.find({ month: { $in: months } }).lean(),
      wonBetween(months[0], months.at(-1)),
      ownerOptions(),
    ]);

    const mine = targets.filter((target) => nameKey(target.owner) === nameKey(owner));
    const counted = owner ? wins.filter((win) => win.assignee === nameKey(owner)) : wins;

    // Each person's target in the current month (or the range's last month), for the overview
    const focus = months.includes(now) ? now : months.at(-1);
    const people = targets
      .filter((target) => target.owner && target.month === focus)
      .map((target) => ({
        ...monthFigures(focus, wins.filter((win) => win.assignee === nameKey(target.owner)), target),
        owner: target.owner,
      }))
      .sort((a, b) => a.owner.localeCompare(b.owner, 'tr'));

    return res.json({
      success: true,
      data: months.map((month) => monthFigures(month, counted, mine.find((target) => target.month === month))),
      owner,
      owners,
      people,
      peopleMonth: focus,
      currentMonth: now,
    });
  } catch (error) {
    console.error('Sales targets error:', error);
    return res.status(500).json({ success: false, message: 'Satış hedefleri yüklenemedi.' });
  }
}

export async function saveTarget(req, res) {
  try {
    await syncTargetIndexes();
    const { month } = req.params;
    if (!MONTH.test(month)) return res.status(400).json({ success: false, message: 'Ay YYYY-AA biçiminde olmalı.' });

    const owner = cleanOwner(req.body?.owner);
    const list = Array.isArray(req.body?.amounts) ? req.body.amounts : [];
    const deals = req.body?.deals === '' || req.body?.deals === undefined || req.body?.deals === null ? 0 : Number(req.body.deals);

    if (list.length > OFFER_CURRENCIES.length) return res.status(400).json({ success: false, message: 'En fazla üç para birimi girilebilir.' });

    const amounts = [];
    for (const item of list) {
      const currency = String(item?.currency || '');
      const amount = Number(item?.amount);
      if (!OFFER_CURRENCIES.includes(currency)) return res.status(400).json({ success: false, message: 'Para birimi TRY, USD veya EUR olmalı.' });
      if (amounts.some((entry) => entry.currency === currency)) return res.status(400).json({ success: false, message: `${currency} için tek hedef girilebilir.` });
      if (!Number.isFinite(amount) || amount <= 0 || amount > 1e11) return res.status(400).json({ success: false, message: `${currency} için geçerli bir hedef tutarı yazın.` });
      amounts.push({ currency, amount: round(amount) });
    }

    if (!Number.isInteger(deals) || deals < 0 || deals > 100000) return res.status(400).json({ success: false, message: 'Kazanılacak talep sayısı tam sayı olmalı.' });
    if (!amounts.length && deals === 0) return res.status(400).json({ success: false, message: 'En az bir tutar veya talep sayısı yazın.' });

    // The same person written another way ("ayşe yılmaz") updates the existing target;
    // a company target saved before people had targets has no owner field
    const existing = (await SalesTarget.find({ month }).select('owner').lean()).find((target) => nameKey(target.owner) === nameKey(owner));

    const target = await SalesTarget.findOneAndUpdate(
      existing ? { _id: existing._id } : { month, owner },
      { $set: { owner: existing?.owner || owner, amounts, deals, updatedBy: req.admin?.name || req.admin?.email || '' }, $unset: { currency: 1, amount: 1 } },
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
    await syncTargetIndexes();
    const { month } = req.params;
    if (!MONTH.test(month)) return res.status(400).json({ success: false, message: 'Ay YYYY-AA biçiminde olmalı.' });
    const owner = cleanOwner(req.query.owner);
    const targets = await SalesTarget.find({ month }).select('owner').lean();
    const target = targets.find((item) => nameKey(item.owner) === nameKey(owner));
    if (!target) return res.status(404).json({ success: false, message: 'Bu ay için hedef yok.' });
    await SalesTarget.deleteOne({ _id: target._id });
    return res.json({ success: true, data: { month, owner: target.owner } });
  } catch (error) {
    console.error('Delete target error:', error);
    return res.status(500).json({ success: false, message: 'Hedef silinemedi.' });
  }
}
