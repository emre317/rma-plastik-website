import test from 'node:test';
import assert from 'node:assert/strict';

import { memoryModel } from './helpers/memoryModels.js';

const { default: Certificate } = await import('../models/Certificate.js');
const store = memoryModel(Certificate);
const { default: SiteSettings } = await import('../models/SiteSettings.js');
memoryModel(SiteSettings);
const { certificatePayload, createCertificate, importDefaultCertificates, publicCertificates } = await import('../controllers/certificateController.js');
const { default: builtIn } = await import('../../client/src/data/certificates.builtin.js');

const response = () => ({ code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } });

test('the built-in list is the four BelCert certificates and the business registration, as printed', () => {
  assert.deepEqual(builtIn.map((item) => [item.code, item.number, item.validUntil]), [
    ['ISO 9001:2015', 'A1803532', '2027-07-04'],
    ['ISO 14001:2015', 'A1803534', '2027-08-26'],
    ['ISO 45001:2018', 'A1803535', '2027-08-26'],
    ['ISO 10002:2018', 'A1803533', '2027-08-26'],
    ['İşletme Kayıt Belgesi', 'TR-33-K-006441', ''],
  ]);
  // The registration has no end date: it stays on the site
  const registration = certificatePayload(builtIn[4]);
  assert.equal(registration.category, 'registration');
  assert.equal(registration.validUntil, null);
  assert.equal(registration.issuedAt.toISOString().slice(0, 10), '2013-01-30');
  for (const item of builtIn) {
    assert.match(item.file, /^\/documents\/certificates\/.+\.pdf$/);
    assert.ok(item.i18n.tr.title && item.i18n.en.title && item.i18n.ar.title);
  }
});

test('payload: only our file paths, https links, known categories, dates', () => {
  const data = certificatePayload({
    code: ' ISO 9001:2015 ', category: 'nope', file: '/etc/passwd', image: 'https://evil.example/x.png',
    verifyUrl: 'javascript:alert(1)', issuedAt: '2026-07-04', validUntil: 'soon', i18n: { tr: { title: 'Kalite' } },
  });
  assert.equal(data.code, 'ISO 9001:2015');
  assert.equal(data.category, 'quality');
  assert.equal(data.file, '');
  assert.equal(data.image, '');
  assert.equal(data.verifyUrl, '');
  assert.equal(data.issuedAt.toISOString(), '2026-07-04T09:00:00.000Z');
  assert.equal(data.validUntil, null);

  const ok = certificatePayload({ file: '/uploads/certificates/ab-12.pdf', image: '/uploads/certificates/ab-12.webp', verifyUrl: 'https://www.belcert.com' });
  assert.equal(ok.file, '/uploads/certificates/ab-12.pdf');
  assert.equal(ok.image, '/uploads/certificates/ab-12.webp');
  assert.equal(ok.verifyUrl, 'https://www.belcert.com');
});

test('a certificate needs a standard and a Turkish title; dates must be in order', async () => {
  for (const body of [{ i18n: { tr: { title: 'X' } } }, { code: 'ISO 1' }, { code: 'ISO 1', i18n: { tr: { title: 'X' } }, issuedAt: '2026-08-26', validUntil: '2025-01-01' }]) {
    const res = response();
    await createCertificate({ body }, res);
    assert.equal(res.code, 400, JSON.stringify(body));
  }
});

test('public list: null without panel records; hidden and expired ones are left out', async () => {
  store.reset();
  assert.equal(await publicCertificates(), null);

  const now = new Date('2026-11-10T09:00:00Z');
  await Certificate.create({ ...certificatePayload(builtIn[0]), order: 1 });
  await Certificate.create({ ...certificatePayload({ ...builtIn[1], validUntil: '2026-11-01' }), order: 2 });
  await Certificate.create({ ...certificatePayload(builtIn[2]), published: false, order: 3 });

  const list = await publicCertificates(now);
  assert.deepEqual(list.map((item) => item.code), ['ISO 9001:2015']);
  assert.equal(list[0].validUntil, '2027-07-04');
  assert.equal(list[0].i18n.en.title, 'Quality Management System');

  // All hidden: an empty list (the site does not fall back to the built-in one)
  store.store.forEach((doc) => doc.set({ published: false }));
  assert.deepEqual(await publicCertificates(now), []);
});

test('import adds only the built-in certificates the panel does not have', async () => {
  store.reset();
  // The panel has the four ISO certificates (one renamed with extra spaces, one hidden)
  await Certificate.create({ ...certificatePayload(builtIn[0]), order: 10 });
  await Certificate.create({ ...certificatePayload({ ...builtIn[1], code: ' ISO  14001:2015 ' }), order: 20 });
  await Certificate.create({ ...certificatePayload(builtIn[2]), published: false, order: 30 });
  await Certificate.create({ ...certificatePayload(builtIn[3]), order: 40 });

  let res = response();
  await importDefaultCertificates({}, res);
  assert.equal(res.code, 201);
  assert.deepEqual(res.body.added, ['İşletme Kayıt Belgesi']);
  assert.equal(store.store.length, 5);
  const added = store.store.find((doc) => doc.code === 'İşletme Kayıt Belgesi');
  assert.equal(added.order, 50);
  assert.equal(added.category, 'registration');
  // The hidden one stays hidden
  assert.equal(store.store.find((doc) => doc.code === 'ISO 45001:2018').published, false);

  res = response();
  await importDefaultCertificates({}, res);
  assert.equal(res.code, 409);
  assert.equal(store.store.length, 5);

  // Empty panel: all five
  store.reset();
  res = response();
  await importDefaultCertificates({}, res);
  assert.equal(res.body.added.length, 5);
});
