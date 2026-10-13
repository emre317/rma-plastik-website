import mongoose from 'mongoose';

import AuditLog from '../models/AuditLog.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// "2026-03-01" -> start (or end) of that day in Istanbul
function parseDay(value, endOfDay = false) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/* ADMIN: activity log with filters (user, area, date range, search) */
export async function listAudit(req, res) {
  try {
    const filter = {};
    const { user, area, from, to } = req.query;

    if (typeof user === 'string' && mongoose.isValidObjectId(user)) filter['user.id'] = new mongoose.Types.ObjectId(user);
    if (typeof area === 'string' && ['sales', 'content', 'users', 'settings', 'auth'].includes(area)) filter.area = area;

    const start = parseDay(from);
    const end = parseDay(to, true);
    if (start || end) filter.at = { ...(start ? { $gte: start } : {}), ...(end ? { $lte: end } : {}) };

    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = ['action', 'targetLabel', 'details', 'user.name', 'user.email'].map((field) => ({ [field]: pattern }));
    }

    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 200);

    const [entries, total, users] = await Promise.all([
      AuditLog.find(filter).sort({ at: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AuditLog.countDocuments(filter),
      AuditLog.aggregate([
        { $match: { 'user.id': { $ne: null } } },
        { $sort: { at: -1 } },
        { $group: { _id: '$user.id', name: { $first: '$user.name' }, email: { $first: '$user.email' } } },
        { $sort: { name: 1 } },
      ]),
    ]);

    return res.json({
      success: true,
      data: entries,
      users: users.map((item) => ({ id: item._id, name: item.name, email: item.email })),
      pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
    });
  } catch (error) {
    console.error('List audit error:', error);
    return res.status(500).json({ success: false, message: 'İşlem geçmişi yüklenemedi.' });
  }
}

/* History of one record (e.g. a quote request), newest first */
export async function getTargetHistory(req, res, targetType) {
  try {
    const entries = await AuditLog.find({ targetType, targetId: String(req.params.id) })
      .sort({ at: -1 })
      .limit(100)
      .select('at user.name user.email action details')
      .lean();

    return res.json({ success: true, data: entries });
  } catch (error) {
    console.error('Target history error:', error);
    return res.status(500).json({ success: false, message: 'Geçmiş yüklenemedi.' });
  }
}
