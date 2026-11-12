import test from 'node:test';
import assert from 'node:assert/strict';

import ProductFamily from '../models/ProductFamily.js';
import ProductGroup from '../models/ProductGroup.js';
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

test('a model carries its own description and features, only where filled', () => {
  const doc = new ProductFamily({
    familyId: 'vertical-tanks',
    columns: ['volume'],
    i18n: { tr: { title: 'Dikey Tanklar' } },
    rows: [
      { code: 'RD 100', values: { volume: 100 } },
      { code: 'RD 5000', values: { volume: 5000 }, i18n: { tr: { text: 'Geniş kapaklı model.', features: 'Çift kapak\nSeviye göstergesi' }, en: { text: 'Wide-lid model.' } } },
    ],
  });
  const [plain, own] = toPublicFamily(doc).rows;

  assert.equal('i18n' in plain, false);
  assert.deepEqual(own.i18n, {
    tr: { text: 'Geniş kapaklı model.', features: ['Çift kapak', 'Seviye göstergesi'] },
    en: { text: 'Wide-lid model.' },
  });
  assert.equal(own.volume, 5000);
});

test('a product group stores a feature heading and list per language', () => {
  const group = new ProductGroup({
    groupId: 'vertical',
    i18n: { tr: { label: 'Dikey Tanklar', featuresTitle: 'Tanklarımızda Standart', features: 'UV koruması\nTaşıma kulpları' } },
  });

  assert.equal(group.validateSync(), undefined);
  assert.equal(group.i18n.tr.featuresTitle, 'Tanklarımızda Standart');
  assert.deepEqual(featureLines(group.i18n.tr.features), ['UV koruması', 'Taşıma kulpları']);
  assert.equal(group.i18n.en.features, '');
});

test('technical drawing: on the family and on a model, only files from the drawing upload', () => {
  const file = '/uploads/drawings/0f8fad5b-d9cb-469f-a165-70867728950e.pdf';
  const doc = new ProductFamily({
    familyId: 'silo-tanks',
    drawing: file,
    i18n: { tr: { title: 'Silo Tanklar' } },
    rows: [{ code: 'RS 500', drawing: file.replace('.pdf', '.docx') }, { code: 'RS 1000' }],
  });

  assert.equal(doc.validateSync(), undefined);
  const family = toPublicFamily(doc);
  assert.equal(family.drawing, file);
  assert.equal(family.rows[0].drawing, file.replace('.pdf', '.docx'));
  assert.equal('drawing' in family.rows[1], false);

  doc.drawing = '/uploads/drawings/../../.env';
  doc.rows[1].drawing = 'https://example.com/a.pdf';
  assert.deepEqual(Object.keys(doc.validateSync().errors).sort(), ['drawing', 'rows.1.drawing']);
});
