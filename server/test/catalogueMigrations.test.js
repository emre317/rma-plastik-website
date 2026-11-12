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

// A panel saved before the change: no rectangular group, the table under the horizontal tanks
for (const doc of await builtInGroupDocs()) {
  if (doc.groupId !== 'rectangular') await ProductGroup.create(doc);
}
for (const doc of await builtInFamilyDocs()) {
  await ProductFamily.create(doc.familyId === 'rectangular-tanks' ? { ...doc, group: 'horizontal' } : doc);
}
for (const doc of await builtInSectorDocs()) {
  await Sector.create({
    ...doc,
    products: doc.products.map((product) => (product.families?.[0] === 'rectangular-tanks' ? { ...product, group: 'fuel' } : product)),
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
  assert.equal(water.products.find((product) => product.families[0] === 'rectangular-tanks').group, 'rectangular');
  assert.equal(water.products[0].group, 'vertical');
  assert.ok((await SiteSettings.findOne({ singleton: 'site' })).contentChangedAt);
});

test('it runs once: later panel edits are left alone', async () => {
  const doc = await family();
  doc.group = 'fuel';
  await doc.save();

  assert.equal(await runCatalogueMigrations(), false);
  assert.equal((await family()).group, 'fuel');
});
