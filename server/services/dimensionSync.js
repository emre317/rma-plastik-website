import ProductFamily from '../models/ProductFamily.js';
import { markContentChanged } from '../models/SiteSettings.js';

/*
  Applies a list of measurement changes ({ familyId, code, field, from, to })
  to the product tables saved in the database (Ürün Tabloları). A value is
  changed only while it still holds the old value; a value edited in the
  panel since then is left alone and reported. Models in `removals`
  ({ familyId, code }) are taken out of their table. Without { apply: true }
  nothing is written.
*/
const same = (a, b) => String(a ?? '').trim() === String(b ?? '').trim();

export async function syncDimensions(changes, { apply = false, removals = [] } = {}) {
  const report = { updated: [], already: [], edited: [], missingRow: [], missingFamily: [], removed: [] };
  const familyIds = [...new Set([...changes, ...removals].map((change) => change.familyId))];

  for (const familyId of familyIds) {
    const family = await ProductFamily.findOne({ familyId });
    const list = changes.filter((change) => change.familyId === familyId);
    const drop = removals.filter((item) => item.familyId === familyId);

    if (!family) {
      report.missingFamily.push(familyId);
      continue;
    }

    let dirty = false;

    for (const change of list) {
      const label = `${familyId} · ${change.code} · ${change.field}`;
      const row = (family.rows || []).find((item) => same(item.code, change.code));

      if (!row) {
        report.missingRow.push(label);
        continue;
      }

      const current = row.values?.[change.field];

      if (same(current, change.to)) {
        report.already.push(label);
      } else if (same(current, change.from)) {
        report.updated.push(`${label}: ${change.from} → ${change.to}`);
        if (apply) {
          row.values = { ...(row.values || {}), [change.field]: change.to };
          dirty = true;
        }
      } else {
        report.edited.push(`${label}: panelde ${current ?? '—'} (beklenen ${change.from}, yeni ${change.to})`);
      }
    }

    for (const item of drop) {
      const before = (family.rows || []).length;
      const rows = (family.rows || []).filter((row) => !same(row.code, item.code));
      if (rows.length === before) continue;
      report.removed.push(`${familyId} · ${item.code}`);
      if (apply) {
        family.rows = rows;
        dirty = true;
      }
    }

    if (dirty) {
      family.markModified('rows');
      await family.save();
    }
  }

  if (apply && (report.updated.length || report.removed.length)) await markContentChanged();

  return report;
}

/*
  Adds what the price list brought in and the database does not have yet:
  whole tables (families), single models (rows) and product groups, taken
  from the built-in data. Existing records are never overwritten. Nothing is
  added while the database has no tables / groups at all (the site then shows
  the built-in data, which already has them).
*/
export async function syncAdditions(additions = {}, { apply = false } = {}) {
  const [{ builtInFamilyDocs }, { builtInGroupDocs }, { default: ProductGroup }] = await Promise.all([
    import('../controllers/productFamilyController.js'),
    import('../controllers/catalogueController.js'),
    import('../models/ProductGroup.js'),
  ]);
  const report = { families: [], rows: [], groups: [], groupUpdates: [], groupRemovals: [], skipped: [] };
  const builtIn = await builtInFamilyDocs();
  const order = builtIn.map((doc) => doc.familyId);

  if ((await ProductFamily.countDocuments()) === 0) {
    report.skipped.push('Veritabanında ürün tablosu yok: site yerleşik tabloları kullanıyor (yeni modeller zaten içinde).');
  } else {
    for (const familyId of additions.families || []) {
      if (await ProductFamily.findOne({ familyId })) continue;
      const doc = builtIn.find((item) => item.familyId === familyId);
      // Right after the table that comes before it in the built-in order
      let previous = null;
      for (const id of order.slice(0, order.indexOf(familyId)).reverse()) {
        previous = await ProductFamily.findOne({ familyId: id });
        if (previous) break;
      }
      report.families.push(`${familyId} (${doc.rows.length} model)`);
      if (apply) await ProductFamily.create({ ...doc, order: previous ? (previous.order || 0) + 1 : doc.order });
    }

    const byFamily = {};
    for (const item of additions.rows || []) (byFamily[item.familyId] ||= []).push(item.code);

    for (const [familyId, codes] of Object.entries(byFamily)) {
      const family = await ProductFamily.findOne({ familyId });
      const doc = builtIn.find((item) => item.familyId === familyId);
      if (!family || !doc) continue;

      const rows = [...(family.rows || [])];
      let changed = false;
      for (const code of codes) {
        if (rows.some((row) => same(row.code, code))) continue;
        const source = doc.rows.find((row) => same(row.code, code));
        if (!source) continue;
        // After the nearest built-in neighbour that the table already has
        const sourceIndex = doc.rows.indexOf(source);
        let at = 0;
        for (const neighbour of doc.rows.slice(0, sourceIndex).reverse()) {
          const index = rows.findIndex((row) => same(row.code, neighbour.code));
          if (index >= 0) { at = index + 1; break; }
        }
        rows.splice(at, 0, source);
        changed = true;
        report.rows.push(`${familyId} · ${code}`);
      }
      if (changed && apply) {
        family.rows = rows;
        family.markModified('rows');
        await family.save();
      }
    }
  }

  if ((await ProductGroup.countDocuments()) === 0) {
    report.skipped.push('Veritabanında ürün grubu yok: site yerleşik grupları kullanıyor.');
  } else {
    const groupDocs = await builtInGroupDocs();
    for (const groupId of additions.groups || []) {
      if (await ProductGroup.findOne({ groupId })) continue;
      const doc = groupDocs.find((item) => item.groupId === groupId);
      const index = groupDocs.indexOf(doc);
      let previous = null;
      for (const item of groupDocs.slice(0, index).reverse()) {
        previous = await ProductGroup.findOne({ groupId: item.groupId });
        if (previous) break;
      }
      report.groups.push(groupId);
      if (apply) await ProductGroup.create({ ...doc, order: previous ? (previous.order || 0) + 1 : doc.order });
    }
    // Groups replaced by tables in other groups (e.g. underground tanks)
    for (const groupId of additions.groupRemovals || []) {
      const group = await ProductGroup.findOne({ groupId });
      if (!group) continue;
      report.groupRemovals.push(groupId);
      if (apply) await group.deleteOne();
    }
    for (const update of additions.groupUpdates || []) {
      const group = await ProductGroup.findOne({ groupId: update.groupId });
      if (!group || group[update.field] !== update.from) continue;
      report.groupUpdates.push(`${update.groupId}: ${update.field} ${update.from} → ${update.to}`);
      if (apply) {
        group[update.field] = update.to;
        await group.save();
      }
    }
  }

  const any = report.families.length || report.rows.length || report.groups.length || report.groupUpdates.length || report.groupRemovals.length;
  if (apply && any) await markContentChanged();
  return report;
}
