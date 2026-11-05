import test from 'node:test';
import assert from 'node:assert/strict';

import { memoryModel } from './helpers/memoryModels.js';

const models = {};
for (const name of ['ConsentRecord', 'Suppression', 'Lead']) {
  models[name] = (await import(`../models/${name}.js`)).default;
  memoryModel(models[name]);
}
const { ConsentRecord, Suppression, Lead } = models;
const {
  readConsents, recordConsents, withdrawConsents, isSuppressed, salesFollowUp, hasMarketing,
} = await import('../services/consents.js');
const { quoteExpiry, leadExpiry } = await import('../services/retention.js');

test('only boxes ticked with true count, each form has its own boxes', () => {
  assert.deepEqual(readConsents({ a: true, bEmail: 'yes', bSms: true, c: false }, 'quote'),
    { A: true, 'B-email': false, 'B-sms': true, 'B-call': false, C: false });
  assert.deepEqual(readConsents(undefined, 'catalog'), { A: false, 'B-email': false, C: false });
  assert.equal(hasMarketing({ A: false, 'B-email': false, C: true }), false);
  assert.equal(hasMarketing({ A: false, 'B-email': true, C: false }), true);
});

test('every box is recorded with its text version; a "no" gets an expiry', async () => {
  const docs = await recordConsents({
    form: 'quote',
    consents: { A: true, 'B-email': true, 'B-sms': false, 'B-call': false, C: false },
    contact: { email: 'ayse@firma.com.tr', phone: '+90 532 111 22 33', name: 'Ayşe', company: 'Firma' },
  });

  assert.equal(docs.length, 5);
  const a = await ConsentRecord.findOne({ email: 'ayse@firma.com.tr', box: 'A' });
  assert.equal(a.value, true);
  assert.equal(a.textVersion, 'A-v1.0');
  assert.equal(a.expireAt, null);
  const sms = await ConsentRecord.findOne({ email: 'ayse@firma.com.tr', box: 'B-sms' });
  assert.equal(sms.value, false);
  assert.ok(sms.expireAt > new Date());
});

test('withdrawing ends the consents, fills the opt-out list and resets the catalogue record', async () => {
  await Lead.create({ email: 'ayse@firma.com.tr', marketingConsent: true, expireAt: null });

  const result = await withdrawConsents('Ayse@Firma.com.tr');
  assert.equal(result.withdrawn, 2);

  const a = await ConsentRecord.findOne({ email: 'ayse@firma.com.tr', box: 'A' });
  assert.ok(a.withdrawnAt);
  assert.ok(a.expireAt > new Date());
  assert.equal(await isSuppressed({ email: 'ayse@firma.com.tr' }), true);
  assert.equal(await isSuppressed({ phone: '905321112233' }), true);

  const lead = await Lead.findOne({ email: 'ayse@firma.com.tr' });
  assert.equal(lead.marketingConsent, false);
  assert.ok(lead.expireAt > new Date());
});

test('a new marketing consent lifts the opt-out', async () => {
  await recordConsents({ form: 'catalog', consents: { A: false, 'B-email': true, C: false }, contact: { email: 'ayse@firma.com.tr' } });
  assert.equal(await isSuppressed({ email: 'ayse@firma.com.tr' }), false);
  assert.ok(await Suppression.exists({ type: 'phone', value: '905321112233' }));
});

test('sales follow-up only for a company with a business e-mail', () => {
  assert.equal(salesFollowUp({ company: 'Akdeniz Gıda', email: 'satin@akdenizgida.com' }), true);
  assert.equal(salesFollowUp({ company: 'Akdeniz Gıda', email: 'ali@gmail.com' }), false);
  assert.equal(salesFollowUp({ company: '', email: 'satin@akdenizgida.com' }), false);
});

test('retention: quotes 3 years, catalogue records 2 years', () => {
  const from = new Date('2026-11-05T10:00:00Z');
  assert.equal(quoteExpiry(from).toISOString(), '2029-11-05T10:00:00.000Z');
  assert.equal(leadExpiry(from).toISOString(), '2028-11-05T10:00:00.000Z');
});
