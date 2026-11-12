import test from 'node:test';
import assert from 'node:assert/strict';

import { memoryModel } from './helpers/memoryModels.js';

const models = {};
for (const name of ['ProductFamily', 'ProductGroup', 'Sector', 'SiteSettings']) {
  models[name] = (await import(`../models/${name}.js`)).default;
  memoryModel(models[name]);
}
const { ProductFamily, ProductGroup, Sector, SiteSettings } = models;
const { builtInFamilyDocs } = await import('../controllers/productFamilyController.js');
const { builtInGroupDocs, builtInSectorDocs } = await import('../controllers/catalogueController.js');
const { runCatalogueMigrations } = await import('../services/catalogueMigrations.js');

// A panel saved before the change: no rectangular group, the table under the horizontal tanks,
// planters made to order without a model table
for (const doc of await builtInGroupDocs()) {
  if (doc.groupId !== 'rectangular') await ProductGroup.create(doc.groupId === 'planters' ? { ...doc, quoteOnly: true } : doc);
}
for (const doc of await builtInFamilyDocs()) {
  if (doc.familyId === 'planters') continue;
  await ProductFamily.create(doc.familyId === 'rectangular-tanks' ? { ...doc, group: 'horizontal' } : doc);
}
for (const doc of await builtInSectorDocs()) {
  // ...and the sector texts still said "Kare"
  const water = doc.sectorId === 'water';
  await Sector.create({
    ...doc,
    i18n: water ? { ...doc.i18n, tr: { ...doc.i18n.tr, description: doc.i18n.tr.description.replace('köşeli', 'kare') } } : doc.i18n,
    products: doc.products.map((product) => (product.families?.[0] === 'rectangular-tanks'
      ? { ...product, group: 'fuel', i18n: { ...product.i18n, tr: { name: 'Kare Tanklar' }, en: { name: 'Caravan Tanks' } } }
      : product)),
  });
}

const family = () => ProductFamily.findOne({ familyId: 'rectangular-tanks' });

test('rectangular tanks get their own group, right after the horizontal tanks', async () => {
  assert.equal(await runCatalogueMigrations(), true);

  const group = await ProductGroup.findOne({ groupId: 'rectangular' });
  const horizontal = await ProductGroup.findOne({ groupId: 'horizontal' });
  const twoLayer = await ProductGroup.findOne({ groupId: 'twoLayer' });
  assert.equal(group.i18n.tr.label, 'Köşeli Tanklar');
  assert.equal(group.category, 'tanks');
  assert.ok(group.order > horizontal.order && group.order < twoLayer.order);

  assert.equal((await family()).group, 'rectangular');
  const water = await Sector.findOne({ sectorId: 'water' });
  const product = water.products.find((item) => item.families[0] === 'rectangular-tanks');
  assert.equal(product.group, 'rectangular');
  assert.equal(product.i18n.tr.name, 'Köşeli Tanklar');
  assert.equal(product.i18n.en.name, 'Caravan Tanks', 'a name written in the panel stays');
  assert.match(water.i18n.tr.description, /dikey, yatay, köşeli ve çift katmanlı/);
  assert.equal(water.products[0].group, 'vertical');
  assert.ok((await SiteSettings.findOne({ singleton: 'site' })).contentChangedAt);
});

test('planters get their model table and the group shows it', async () => {
  const planters = await ProductFamily.findOne({ familyId: 'planters' });
  assert.equal(planters.group, 'planters');
  assert.equal(planters.rows.length, 38);
  assert.deepEqual(planters.rows.find((row) => row.code === 'RSP21').values, {
    width: 50, lengthOrHeight: 50, height: 50, depth: 20, diameter: null, weight: 7,
  });
  assert.ok(!planters.rows.some((row) => /price|fiyat/i.test(JSON.stringify(row))));
  assert.equal((await ProductGroup.findOne({ groupId: 'planters' })).quoteOnly, false);
});

test('it runs once: later panel edits are left alone', async () => {
  const doc = await family();
  doc.group = 'fuel';
  await doc.save();

  assert.equal(await runCatalogueMigrations(), false);
  assert.equal((await family()).group, 'fuel');
});
