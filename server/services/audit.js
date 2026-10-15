import AuditLog from '../models/AuditLog.js';

/*
  Activity log helpers.
    logAudit(req, { area, action, targetType, targetId, targetLabel, details, user })
    router.put('/x/:id', audit({ area, type, action, lookup: Model, details }), handler)
  The middleware writes the entry only when the request succeeded (status < 400).
  `lookup` reads the document before the handler runs (its name survives a delete);
  `details(req, data, before)` returns an extra line. A failed write never breaks a request.
*/

const text = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

const pickText = (value) => (typeof value === 'string' ? value : value && typeof value === 'object' ? value.tr || value.en || '' : '');

/* A readable name for any panel document */
export function labelOf(doc) {
  if (!doc || typeof doc !== 'object') return '';

  const tr = doc.i18n?.tr || {};
  const candidates = [
    doc.company,
    pickText(doc.title),
    tr.title,
    tr.label,
    tr.question,
    pickText(doc.question),
    pickText(doc.name),
    tr.name,
    tr.caption,
    pickText(doc.caption),
    doc.email,
    doc.code,
    doc.familyId,
    doc.groupId,
    doc.sectorId,
    doc.slug,
  ];

  return text(candidates.find((value) => typeof value === 'string' && value.trim()) || '', 200);
}

export async function logAudit(req, entry) {
  try {
    const user = entry.user || req.admin;

    await AuditLog.create({
      user: user ? { id: user._id || user.id || null, name: user.name || '', email: user.email || '', role: user.role || '' } : {},
      area: entry.area || '',
      action: text(entry.action, 120),
      targetType: entry.targetType || '',
      targetId: entry.targetId ? String(entry.targetId) : '',
      targetLabel: text(entry.targetLabel, 200),
      details: text(entry.details, 500),
      ip: text(req.ip, 64),
    });
  } catch (error) {
    console.error('Audit log error:', error.message);
  }
}

export function audit({ area, type, action, lookup, label, details }) {
  return async (req, res, next) => {
    let before = null;

    if (lookup && req.params.id) {
      try {
        before = await lookup.findById(req.params.id).lean();
      } catch {
        before = null;
      }
    }

    // Keep the JSON answer so the entry can name what was created or changed
    const json = res.json.bind(res);
    res.json = (body) => {
      res.locals.auditBody = body;
      return json(body);
    };

    res.on('finish', () => {
      if (res.statusCode >= 400 || !req.admin) return;

      const data = res.locals.auditBody?.data;
      const one = data && !Array.isArray(data) ? data : null;

      logAudit(req, {
        area,
        action: typeof action === 'function' ? action(req, one, before) : action,
        targetType: type,
        targetId: req.params.id || one?._id || '',
        targetLabel: (label ? label(req, one, before) : '') || labelOf(one) || labelOf(before),
        details: details ? details(req, one, before, res.locals.auditBody) : '',
      });
    });

    return next();
  };
}
