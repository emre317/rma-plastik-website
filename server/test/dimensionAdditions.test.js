import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { memoryModel } from './helpers/memoryModels.js';

const models = {};
for (const name of ['ProductFamily', 'ProductGroup', 'SiteSettings']) {
  models[name] = (await import(`../models/${name}.js`)).default;
  memoryModel(models[name]);
}
const { ProductFamily, ProductGroup } = models;
const { builtInFamilyDocs } = await import('../controllers/productFamilyController.js');
const { builtInGroupDocs } = await import('../controllers/catalogueController.js');
const { syncAdditions } = await import('../services/dimensionSync.js');

const { additions } = JSON.parse(fs.readFileSync(new URL('../scripts/data/product-dimensions-2026-09.json', import.meta.url), 'utf8'));
const isNewRow = (familyId, code) => additions.rows.some((item) => item.familyId === familyId && item.code === code);

// A database saved before the price list: without the new tables, models and group
for (const doc of await builtInFamilyDocs()) {
  if (additions.families.includes(doc.familyId)) continue;
  await ProductFamily.create({ ...doc, rows: doc.rows.filter((row) => !isNewRow(doc.familyId, row.code)) });
}
for (const doc of await builtInGroupDocs()) {
  if (additions.groups.includes(doc.groupId)) continue;
  await ProductGroup.create({ ...doc, quoteOnly: doc.groupId === 'pallets' ? true : doc.quoteOnly });
}
// ...which still had the separate underground group
await ProductGroup.create({ groupId: 'underground', category: 'tanks', quoteOnly: true, order: 35, i18n: { tr: { label: 'Yeraltı Tankları' } } });

const codes = async (familyId) => (await ProductFamily.findOne({ familyId })).rows.map((row) => row.code);

test('a dry run lists the additions and writes nothing', async () => {
  const report = await syncAdditions(additions);
  assert.equal(report.families.length, additions.families.length);
  assert.equal(report.rows.length, additions.rows.length);
  assert.deepEqual(report.groups, ['bins']);
  assert.deepEqual(report.groupRemovals, ['underground']);
  assert.ok(await ProductGroup.findOne({ groupId: 'underground' }), 'dry run keeps it');
  assert.equal(report.groupUpdates.length, 1);
  assert.equal(await ProductFamily.findOne({ familyId: 'pallets' }), null);
  assert.ok(!(await codes('vertical-tanks')).includes('RD 501 HK'));
});

test('--apply adds tables, models and the group in their place; nothing is overwritten', async () => {
  // A model edited in the panel stays as it is
  const vertical = await ProductFamily.findOne({ familyId: 'vertical-tanks' });
  vertical.rows.find((row) => row.code === 'RD 300').values.height = 141;

  await syncAdditions(additions, { apply: true });

  const list = await codes('vertical-tanks');
  assert.deepEqual(list.slice(list.indexOf('RD 300'), list.indexOf('RD 300') + 4), ['RD 300', 'RD 501 HK', 'RD 750 HK', 'RD 1000 HK']);
  assert.equal(list.indexOf('RD 8000'), list.indexOf('RD 5003') + 1);
  assert.equal((await ProductFamily.findOne({ familyId: 'vertical-tanks' })).rows.find((row) => row.code === 'RD 300').values.height, 141);
  assert.ok((await codes('brine-tanks')).includes('RDSMR 7000'));
  assert.deepEqual(await codes('pallets'), ['RP 70*100', 'RP 80*120', 'RP 90*100', 'RP 100*100', 'RP 100*120', 'RP 105*105', 'RP 120*120']);

  assert.equal(await ProductGroup.findOne({ groupId: 'underground' }), null);
  const underground = await ProductFamily.findOne({ familyId: 'underground-vertical-tanks' });
  assert.ok(underground && underground.rows.length === 0 && underground.group === 'vertical');
  assert.equal((await ProductFamily.findOne({ familyId: 'underground-horizontal-tanks' })).group, 'horizontal');
  const pallets = await ProductGroup.findOne({ groupId: 'pallets' });
  const bins = await ProductGroup.findOne({ groupId: 'bins' });
  assert.equal(pallets.quoteOnly, false);
  assert.ok(bins && bins.order === pallets.order + 1);
  assert.equal(bins.i18n.tr.label, 'Çöp Kovaları');

  const turnip = await ProductFamily.findOne({ familyId: 'turnip-tanks' });
  const pickle = await ProductFamily.findOne({ familyId: 'pickle-tanks' });
  assert.equal(turnip.order, pickle.order + 1);
  assert.equal(turnip.i18n.tr.title, 'Şalgam Tankları');

  const again = await syncAdditions(additions, { apply: true });
  assert.equal(again.families.length + again.rows.length + again.groups.length + again.groupUpdates.length + again.groupRemovals.length, 0);
});

test('an empty database is left alone (the built-in data already has everything)', async () => {
  const saved = [...(await ProductFamily.find())];
  for (const doc of saved) await doc.deleteOne();
  const report = await syncAdditions(additions, { apply: true });
  assert.equal(report.families.length, 0);
  assert.match(report.skipped[0], /yerleşik/);
});
