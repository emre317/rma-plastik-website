import test from 'node:test';
import assert from 'node:assert/strict';

import { memoryModel } from './helpers/memoryModels.js';

process.env.JWT_SECRET = 'q'.repeat(40);

const models = {};
for (const name of ['AdminUser', 'QuoteRequest', 'AuditLog']) {
  models[name] = (await import(`../models/${name}.js`)).default;
  memoryModel(models[name]);
}
const { AdminUser, QuoteRequest, AuditLog } = models;
const { createToken } = await import('../controllers/authController.js');
const { default: app } = await import('../app.js');

const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api/quote`;
test.after(() => server.close());

const admin = await AdminUser.create({ name: 'Emre', email: 'emre@rmaplastik.com', password: 'Sifre12345', role: 'admin' });
const sales = await AdminUser.create({ name: 'Ayşe', email: 'ayse@rmaplastik.com', password: 'Sifre12345', role: 'sales' });
const content = await AdminUser.create({ name: 'Mehmet', email: 'mehmet@rmaplastik.com', password: 'Sifre12345', role: 'content' });
const quote = await QuoteRequest.create({ company: 'Akdeniz Gıda', name: 'Ali Veli', email: 'ali@example.com', phone: '+90 532 000 00 00', country: 'Türkiye', product: 'RD 5000' });

const remove = (id, user) => fetch(`${base}/${id}`, { method: 'DELETE', headers: user ? { Authorization: `Bearer ${createToken(user)}` } : {} });

test('only the admin role can delete a quote request', async () => {
  assert.equal((await remove(quote._id)).status, 401);
  assert.equal((await remove(quote._id, sales)).status, 403);
  assert.equal((await remove(quote._id, content)).status, 403);
  assert.ok(await QuoteRequest.findById(quote._id), 'still there after the refused attempts');

  const response = await remove(quote._id, admin);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).reference, `RMA-${String(quote._id).slice(-6).toUpperCase()}`);
  assert.equal(await QuoteRequest.findById(quote._id), null);
});

test('the delete is in the activity log with the request\'s name', async () => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  const entries = await AuditLog.find({ action: 'Teklif talebini sildi' });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].targetLabel, 'Akdeniz Gıda');
  assert.match(entries[0].details, /^RMA-/);
  assert.equal(entries[0].user.email, 'emre@rmaplastik.com');
});

test('an unknown request answers 404', async () => {
  assert.equal((await remove('0123456789abcdef01234567', admin)).status, 404);
  assert.equal((await remove('not-an-id', admin)).status, 404);
});
