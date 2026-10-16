import test from 'node:test';
import assert from 'node:assert/strict';

import { memoryModel } from './helpers/memoryModels.js';

const { default: QuoteRequest } = await import('../models/QuoteRequest.js');
memoryModel(QuoteRequest);
const { trackQuoteMail } = await import('../services/mailTracking.js');

const quote = await QuoteRequest.create({ company: 'Akdeniz Gıda', name: 'Ali Veli', email: 'ali@example.com', phone: '+90 532 000 00 00', country: 'Türkiye', product: 'RD 5000' });

test('a sent e-mail is recorded', async () => {
  const entry = await trackQuoteMail(quote._id, 'notification', async () => ({ messageId: '<1@x>' }));
  assert.equal(entry.status, 'sent');
  const saved = await QuoteRequest.findById(quote._id);
  assert.equal(saved.mail.notification.status, 'sent');
  assert.equal(saved.mail.notification.attempts, 1);
});

test('an SMTP failure keeps the request and records the error (without secrets)', async () => {
  const entry = await trackQuoteMail(quote._id, 'confirmation', async () => { throw new Error('Invalid login: 535 auth failed pass=hunter2'); });
  assert.equal(entry.status, 'failed');
  const saved = await QuoteRequest.findById(quote._id);
  assert.equal(saved.company, 'Akdeniz Gıda');
  assert.equal(saved.mail.confirmation.status, 'failed');
  assert.ok(!saved.mail.confirmation.error.includes('hunter2'));
});

test('resending counts the attempts; no SMTP means "skipped"', async () => {
  await trackQuoteMail(quote._id, 'confirmation', async () => ({ messageId: '<2@x>' }));
  let saved = await QuoteRequest.findById(quote._id);
  assert.equal(saved.mail.confirmation.status, 'sent');
  assert.equal(saved.mail.confirmation.attempts, 2);
  await trackQuoteMail(quote._id, 'notification', async () => null);
  saved = await QuoteRequest.findById(quote._id);
  assert.equal(saved.mail.notification.status, 'skipped');
});

test('a quote request is saved and answered even without SMTP', async () => {
  delete process.env.SMTP_HOST;
  process.env.QUOTE_NOTIFY_TO = 'sales@example.com';
  const { createQuoteRequest } = await import('../controllers/quoteController.js');
  const res = { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };

  await createQuoteRequest({
    body: { company: 'Mersin Tarım', name: 'Zeynep Kaya', email: 'zeynep@example.com', phone: '+90 324 000 00 00', country: 'Türkiye', product: 'RD 1000', message: '', language: 'tr' },
    ip: '127.0.0.1',
    get: () => '',
    headers: {},
  }, res);

  assert.equal(res.code, 201, JSON.stringify(res.body));
  assert.match(res.body.reference, /^RMA-[A-Z0-9]{6}$/);
  assert.equal(res.body.confirmation, false);

  await new Promise((resolve) => setTimeout(resolve, 50));
  const saved = await QuoteRequest.findById(res.body.requestId);
  assert.equal(saved.company, 'Mersin Tarım');
  assert.equal(saved.mail.notification.status, 'skipped');
});
