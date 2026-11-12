import test from 'node:test';
import assert from 'node:assert/strict';

import ProductFamily from '../models/ProductFamily.js';
import { builtInFamilyDocs, featureLines, toPublicFamily } from '../controllers/productFamilyController.js';

test('feature lines: one per line, no blanks, bullets or repeats, capped', () => {
  assert.deepEqual(featureLines(' UV koruması \r\n\n- Taşıma kulpları\n• UV koruması\n'), ['UV koruması', 'Taşıma kulpları']);
  assert.deepEqual(featureLines(['a', '', 5, 'b']), ['a', 'b']);
  assert.deepEqual(featureLines(undefined), []);
  assert.equal(featureLines(Array.from({ length: 40 }, (_, i) => `madde ${i}`)).length, 20);
  assert.equal(featureLines('x'.repeat(500))[0].length, 160);
});

test('published family carries its feature list and heading per language', () => {
  const doc = new ProductFamily({
    familyId: 'pallets',
    i18n: {
      tr: { title: 'Paletler', featuresTitle: 'Paletlerimizde Standart', features: 'Tek parça gövde\nİstiflenebilir' },
      en: { title: 'Pallets' },
    },
  });
  const family = toPublicFamily(doc);

  assert.deepEqual(family.i18n.tr.features, ['Tek parça gövde', 'İstiflenebilir']);
  assert.equal(family.i18n.tr.featuresTitle, 'Paletlerimizde Standart');
  assert.equal('features' in family.i18n.en, false);
  assert.equal('featuresTitle' in family.i18n.en, false);
});

test('imported brochure tables start with their brochure feature lists', async () => {
  const docs = await builtInFamilyDocs();
  const byId = Object.fromEntries(docs.map((doc) => [doc.familyId, doc]));

  // Water tanks share the list of the water tank page
  assert.match(byId['vertical-tanks'].i18n.tr.features, /^Tek parça monoblok gövde\n/);
  assert.equal(byId['vertical-tanks'].i18n.en.features.split('\n').length, 11);
  assert.equal(byId['silo-tanks'].i18n.tr.features.split('\n').length, 8);
  assert.equal(byId['silo-tanks'].i18n.ar.features.split('\n').length, 8);
  // Nothing in the brochure: left for the panel
  assert.equal(byId.pallets.i18n.tr.features, '');
});
