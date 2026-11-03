import test from 'node:test';
import assert from 'node:assert/strict';

import { memoryModel } from './helpers/memoryModels.js';

process.env.JWT_SECRET = 'g'.repeat(40);

const models = {};
for (const name of ['AdminUser', 'ProductFamily', 'AuditLog', 'SiteSettings']) {
  models[name] = (await import(`../models/${name}.js`)).default;
  memoryModel(models[name]);
}
const { AdminUser, ProductFamily } = models;
const { createToken } = await import('../controllers/authController.js');
const { toPublicFamily } = await import('../controllers/productFamilyController.js');
const { default: app } = await import('../app.js');

const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api/admin/product-families`;
test.after(() => server.close());

const editor = await AdminUser.create({ name: 'Mehmet', email: 'mehmet@rmaplastik.com', password: 'Sifre12345', role: 'content' });
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${createToken(editor)}` };

const photo = (n) => `/uploads/products/0000000${n}-aaaa-bbbb-cccc-dddddddddddd.webp`;

const family = {
  familyId: 'gallery-tanks',
  group: 'vertical',
  image: '/images/products/rd-15000.webp',
  // The cover twice, a duplicate, an outside link and a path trick are dropped
  images: ['/images/products/rd-15000.webp', photo(1), photo(2), photo(1), 'https://evil.example/a.jpg', '/uploads/../server/.env'],
  columns: ['volume'],
  i18n: { tr: { title: 'Galeri Tankları', text: '' } },
  rows: [
    { code: 'GT 100', image: photo(3), images: [photo(3), photo(4), photo(5)], values: { volume: '100' } },
    { code: 'GT 200', values: { volume: '200' } },
  ],
};

test('galleries are cleaned and saved with the cover first', async () => {
  const response = await fetch(base, { method: 'POST', headers, body: JSON.stringify(family) });
  const body = await response.json();
  assert.equal(response.status, 201, JSON.stringify(body));

  const saved = await ProductFamily.findById(body.data._id);
  assert.deepEqual([...saved.images], [photo(1), photo(2)]);
  assert.deepEqual([...saved.rows[0].images], [photo(4), photo(5)]);
  assert.deepEqual([...saved.rows[1].images], []);
});

test('at most 12 extra photos are kept for a model', async () => {
  const many = Array.from({ length: 20 }, (_, i) => `/uploads/products/${String(i).padStart(8, '0')}-aaaa-bbbb-cccc-dddddddddddd.webp`);
  const response = await fetch(base, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...family, familyId: 'many-photos', rows: [{ code: 'MP 1', images: many, values: {} }] }),
  });
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.data.rows[0].images.length, 12);
});

test('the public snapshot carries the galleries only when there are photos', async () => {
  const saved = (await ProductFamily.find({ familyId: 'gallery-tanks' }))[0];
  const published = toPublicFamily(saved);

  assert.deepEqual(published.images, [photo(1), photo(2)]);
  assert.equal(published.rows[0].image, photo(3));
  assert.deepEqual(published.rows[0].images, [photo(4), photo(5)]);
  assert.equal('images' in published.rows[1], false);
  assert.equal(published.rows[0].volume, 100);
});
