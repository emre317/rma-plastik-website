import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { memoryModel } from './helpers/memoryModels.js';

const { default: ProductFamily } = await import('../models/ProductFamily.js');
const { default: SiteSettings } = await import('../models/SiteSettings.js');
memoryModel(ProductFamily);
memoryModel(SiteSettings);
const { builtInFamilyDocs } = await import('../controllers/productFamilyController.js');
const { syncDimensions } = await import('../services/dimensionSync.js');

const { changes, removals } = JSON.parse(fs.readFileSync(new URL('../scripts/data/product-dimensions-2026-09.json', import.meta.url), 'utf8'));

// A database imported before the update: the rows still hold the old brochure values
for (const doc of await builtInFamilyDocs()) {
  for (const change of changes.filter((item) => item.familyId === doc.familyId)) {
    const row = doc.rows.find((item) => item.code === change.code);
    row.values[change.field] = change.from;
  }
  // ...and the models taken off the site since
  for (const item of removals.filter((entry) => entry.familyId === doc.familyId)) {
    doc.rows.push({ code: item.code, image: '', values: { volume: 1 } });
  }
  await ProductFamily.create(doc);
}
// One value edited in the panel since then
const vertical = await ProductFamily.findOne({ familyId: 'vertical-tanks' });
vertical.rows.find((row) => row.code === 'RD 300').values.height = 140;

const value = async (familyId, code, field) => (await ProductFamily.findOne({ familyId })).rows.find((row) => row.code === code).values[field];

test('the change list holds measurements only (no prices)', () => {
  assert.ok(changes.length > 50);
  for (const change of changes) {
    assert.ok(['volume', 'diameter', 'width', 'length', 'height', 'cap'].includes(change.field), change.field);
  }
  assert.ok(!/fiyat|price|maliyet|tl\b|usd|eur/i.test(JSON.stringify(changes)));
});

const codes = async (familyId) => (await ProductFamily.findOne({ familyId })).rows.map((row) => row.code);

test('a dry run reports and writes nothing', async () => {
  const report = await syncDimensions(changes, { removals });
  assert.equal(report.removed.length, removals.length);
  assert.ok((await codes('vertical-tanks')).includes('RD 500'));
  assert.equal(report.updated.length, changes.length - 1);
  assert.equal(report.edited.length, 1);
  assert.match(report.edited[0], /RD 300 · height/);
  assert.equal(await value('vertical-tanks', 'RD 200', 'diameter'), 59);
});

test('--apply updates old values only and leaves panel edits alone', async () => {
  const report = await syncDimensions(changes, { apply: true, removals });
  assert.equal(report.updated.length, changes.length - 1);
  assert.equal(report.removed.length, removals.length);
  for (const item of removals) assert.ok(!(await codes(item.familyId)).includes(item.code), item.code);
  assert.ok((await codes('vertical-tanks')).includes('RD 5001'), 'other models stay');
  assert.equal(await value('adblue-tanks', 'AdBlue 5000', 'height'), 240);
  assert.equal(await value('horizontal-tanks', 'RY 1000', 'length'), 170);
  assert.equal(await value('vertical-tanks', 'RD 200', 'diameter'), 57);
  assert.equal(await value('silo-tanks', 'RS 5000', 'cap'), '40-60');
  assert.equal(await value('vertical-tanks', 'RD 300', 'height'), 140);
  assert.equal(await value('vertical-tanks', 'RD 300', 'diameter'), 70);
  // Running again changes nothing
  const again = await syncDimensions(changes, { apply: true, removals });
  assert.equal(again.updated.length, 0);
  assert.equal(again.removed.length, 0);
  assert.equal(again.already.length, changes.length - 1);
});

test('the built-in tables already carry the new values and no removed model', async () => {
  for (const doc of await builtInFamilyDocs()) {
    for (const item of removals.filter((entry) => entry.familyId === doc.familyId)) {
      assert.ok(!doc.rows.some((row) => row.code === item.code), item.code);
    }
    for (const change of changes.filter((item) => item.familyId === doc.familyId)) {
      const row = doc.rows.find((item) => item.code === change.code);
      assert.equal(String(row.values[change.field]), String(change.to), `${change.code} ${change.field}`);
    }
  }
});
