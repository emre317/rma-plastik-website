import test from 'node:test';
import assert from 'node:assert/strict';

import { memoryModel } from './helpers/memoryModels.js';

const models = {};
for (const name of ['AdminUser', 'QuoteRequest', 'SalesTarget']) {
  models[name] = (await import(`../models/${name}.js`)).default;
  memoryModel(models[name]);
}
const { AdminUser, QuoteRequest, SalesTarget } = models;
const { createUser, updateUser } = await import('../controllers/userController.js');

const call = async (handler, { params = {}, body = {}, admin }) => {
  const res = { code: 200, body: null, status(c) { res.code = c; return res; }, json(b) { res.body = b; return res; } };
  await handler({ params, body, admin }, res);
  return res;
};

const boss = await AdminUser.create({ name: 'Emre Yönetici', email: 'emre@rmaplastik.com', password: 'Sifre12345', role: 'admin' });
const ayse = await AdminUser.create({ name: 'Ayse Yilmaz', email: 'ayse@rmaplastik.com', password: 'Sifre12345', role: 'sales' });
await AdminUser.create({ name: 'Mehmet Kaya', email: 'mehmet@rmaplastik.com', password: 'Sifre12345', role: 'content' });
const quote = await QuoteRequest.create({ company: 'Akdeniz Gıda', name: 'Ali Veli', email: 'ali@example.com', phone: '+90 532 000 00 00', country: 'Türkiye', product: 'RD 5000', assignee: 'Ayse Yilmaz' });
const target = await SalesTarget.create({ month: '2026-10', owner: 'Ayse Yilmaz', deals: 3 });

test('an admin corrects another user\'s name, e-mail, phone and title', async () => {
  const res = await call(updateUser, {
    params: { id: String(ayse._id) },
    body: { name: '  Ayşe Yılmaz ', email: 'AYSE.YILMAZ@rmaplastik.com', phone: '+90 (532) 111-22-33', title: 'Satış Temsilcisi' },
    admin: boss,
  });
  assert.equal(res.code, 200, res.body?.message);
  assert.deepEqual(
    { name: res.body.data.name, email: res.body.data.email, phone: res.body.data.phone, title: res.body.data.title },
    { name: 'Ayşe Yılmaz', email: 'ayse.yilmaz@rmaplastik.com', phone: '+90 (532) 111-22-33', title: 'Satış Temsilcisi' },
  );
  const saved = await AdminUser.findById(ayse._id);
  assert.equal(saved.email, 'ayse.yilmaz@rmaplastik.com');
  assert.equal(saved.role, 'sales');
});

test('a renamed user keeps their quote requests and sales targets', async () => {
  assert.equal((await QuoteRequest.findById(quote._id)).assignee, 'Ayşe Yılmaz');
  assert.equal((await SalesTarget.findById(target._id)).owner, 'Ayşe Yılmaz');
});

test('a changed e-mail cancels a pending invitation or reset link', async () => {
  const user = await AdminUser.findById(ayse._id);
  user.resetTokenHash = 'abc';
  user.resetTokenExpires = new Date(Date.now() + 3600000);
  await user.save();
  await call(updateUser, { params: { id: String(ayse._id) }, body: { email: 'ayse@rmaplastik.com' }, admin: boss });
  const saved = await AdminUser.findById(ayse._id);
  assert.equal(saved.resetTokenHash, null);
  assert.equal(saved.resetTokenExpires, null);
});

test('an e-mail used by someone else, a bad e-mail or phone, or an empty name is refused', async () => {
  const taken = await call(updateUser, { params: { id: String(ayse._id) }, body: { email: 'Mehmet@rmaplastik.com' }, admin: boss });
  assert.equal(taken.code, 409);
  assert.equal((await call(updateUser, { params: { id: String(ayse._id) }, body: { email: 'ayse@' }, admin: boss })).code, 400);
  assert.equal((await call(updateUser, { params: { id: String(ayse._id) }, body: { phone: '<script>' }, admin: boss })).code, 400);
  assert.equal((await call(updateUser, { params: { id: String(ayse._id) }, body: { name: '   ' }, admin: boss })).code, 400);
  assert.equal((await AdminUser.findById(ayse._id)).email, 'ayse@rmaplastik.com');
});

test('keeping your own e-mail is not a conflict, and you can edit your own details', async () => {
  const res = await call(updateUser, { params: { id: String(boss._id) }, body: { email: 'emre@rmaplastik.com', title: 'Genel Müdür' }, admin: boss });
  assert.equal(res.code, 200, res.body?.message);
  assert.equal(res.body.data.title, 'Genel Müdür');
  assert.equal(res.body.data.self, true);
});

test('a new user can be added with phone and title', async () => {
  const res = await call(createUser, {
    body: { name: 'Zeynep Ak', email: 'zeynep@rmaplastik.com', password: 'Sifre12345', role: 'sales', phone: '0532 222 33 44', title: 'İhracat Sorumlusu' },
    admin: boss,
  });
  assert.equal(res.code, 201, res.body?.message);
  assert.equal(res.body.data.phone, '0532 222 33 44');
  assert.equal(res.body.data.title, 'İhracat Sorumlusu');
});
