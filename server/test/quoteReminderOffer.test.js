import test from 'node:test';
import assert from 'node:assert/strict';

import { memoryModel } from './helpers/memoryModels.js';

process.env.JWT_SECRET = 'q'.repeat(40);
delete process.env.SMTP_HOST;

const models = {};
for (const name of ['AdminUser', 'QuoteRequest', 'AuditLog']) {
  models[name] = (await import(`../models/${name}.js`)).default;
  memoryModel(models[name]);
}
const { AdminUser, QuoteRequest } = models;
const { createToken } = await import('../controllers/authController.js');
const { default: app } = await import('../app.js');

const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api/quote`;
test.after(() => server.close());

const admin = await AdminUser.create({ name: 'Emre', email: 'emre@rmaplastik.com', password: 'Sifre12345', role: 'admin' });
const content = await AdminUser.create({ name: 'Mehmet', email: 'mehmet@rmaplastik.com', password: 'Sifre12345', role: 'content' });

const offer = { lines: [{ name: 'RD 5000', quantity: 1, unitPrice: 1000 }], savedAt: new Date() };

const makeQuote = (data = {}) => QuoteRequest.create({
  company: 'Akdeniz Gıda', name: 'Ali Veli', email: 'ali@example.com', phone: '+90 532 000 00 00', country: 'Türkiye', product: 'RD 5000',
  ...data,
});

function remind(id, user) {
  const form = new FormData();
  form.append('pdf', new Blob([Buffer.from('%PDF-1.4')], { type: 'application/pdf' }), 'offer.pdf');
  return fetch(`${base}/${id}/offer/remind`, {
    method: 'POST',
    headers: user ? { Authorization: `Bearer ${createToken(user)}` } : {},
    body: form,
  });
}

test('only a logged-in sales/admin user can request a reminder', async () => {
  const quote = await makeQuote({ offer: { ...offer, sentAt: new Date() } });
  assert.equal((await remind(quote._id)).status, 401);
  assert.equal((await remind(quote._id, content)).status, 403);
});

test('a quote whose proforma was never sent cannot be reminded', async () => {
  const quote = await makeQuote();
  const response = await remind(quote._id, admin);
  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /önce proforma gönderilmelidir/);
});

test('a quote already marked won or lost cannot be reminded', async () => {
  const quote = await makeQuote({ offer: { ...offer, sentAt: new Date() }, outcome: 'won' });
  const response = await remind(quote._id, admin);
  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /Sonuçlandırılmış/);
});

test('a remindable quote still refuses without SMTP configured, same as sending the offer itself', async () => {
  const quote = await makeQuote({ offer: { ...offer, sentAt: new Date() } });
  const response = await remind(quote._id, admin);
  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /SMTP\) ayarlı değil/);
  // No reminder was recorded for the failed attempt
  assert.equal((await QuoteRequest.findById(quote._id)).offer.reminders.length, 0);
});

test('an unknown quote id answers 404', async () => {
  assert.equal((await remind('000000000000000000000000', admin)).status, 404);
});
