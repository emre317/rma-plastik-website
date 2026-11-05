import test from 'node:test';
import assert from 'node:assert/strict';

import { memoryModel } from './helpers/memoryModels.js';

delete process.env.SMTP_HOST;

const { default: Meeting } = await import('../models/Meeting.js');
const meetings = memoryModel(Meeting);
const { default: QuoteRequest } = await import('../models/QuoteRequest.js');
const quotes = memoryModel(QuoteRequest);
const { convertMeetingToQuote, saveMeetingResult } = await import('../controllers/meetingController.js');

const response = () => ({ code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } });
const admin = { _id: null, name: 'Ayşe Demir' };

const held = () => Meeting.create({
  type: 'inPerson', status: 'confirmed', company: 'Akdeniz Gıda', name: 'Ali Veli', email: 'ali@example.com', phone: '+90 532 000 00 00',
  country: 'Türkiye', topic: 'product', subject: 'Dikey tank', language: 'tr', requestedStartAt: new Date(Date.now() - 86400000),
  startAt: new Date(Date.now() - 86400000), staff: [{ name: 'Mehmet Yılmaz', email: 'mehmet@rmaplastik.com' }], location: 'Fabrika',
  attribution: { channel: 'Google Ads' },
});

test('the meeting outcome and notes are saved', async () => {
  const meeting = await held();
  const res = response();
  await saveMeetingResult({ params: { id: String(meeting._id) }, body: { outcome: 'followUp', note: 'Bütçe ocakta netleşecek.' }, admin }, res);
  assert.equal(res.code, 200);
  assert.equal(meeting.result.outcome, 'followUp');
  assert.equal(meeting.result.recordedBy, 'Ayşe Demir');

  const bad = response();
  await saveMeetingResult({ params: { id: String(meeting._id) }, body: { outcome: 'nope' }, admin }, bad);
  assert.equal(meeting.result.outcome, '');
});

test('a held meeting becomes one quote request with the customer, notes and owner', async () => {
  quotes.reset();
  const meeting = await held();
  const res = response();
  await convertMeetingToQuote({ params: { id: String(meeting._id) }, body: { product: 'RD 10000 dikey tank', quantity: '10', note: '10 adet, mavi, Mart teslim.', followUpAt: '2026-12-01' }, admin }, res);
  assert.equal(res.code, 201, res.body?.message);

  const quote = quotes.store[0];
  assert.equal(String(res.body.quoteId), String(quote._id));
  assert.equal(quote.source, 'meeting');
  assert.equal(String(quote.meetingId), String(meeting._id));
  assert.equal(quote.company, 'Akdeniz Gıda');
  assert.equal(quote.email, 'ali@example.com');
  assert.equal(quote.product, 'RD 10000 dikey tank');
  assert.equal(quote.quantity, 10);
  assert.equal(quote.status, 'reviewing');
  assert.equal(quote.assignee, 'Mehmet Yılmaz');
  assert.match(quote.message, /Yüz yüze görüşme \(TPL-/);
  assert.match(quote.message, /Mart teslim/);
  assert.equal(quote.notes.length, 1);
  assert.equal(quote.attribution.channel, 'Google Ads');
  assert.equal(String(meeting.quoteId), String(quote._id));
  assert.equal(meeting.result.outcome, 'quote');

  // Only once
  const again = response();
  await convertMeetingToQuote({ params: { id: String(meeting._id) }, body: {}, admin }, again);
  assert.equal(again.code, 409);
  assert.equal(String(again.body.quoteId), String(quote._id));
  assert.equal(quotes.store.length, 1);
});

test('pending or cancelled meetings cannot be converted; the subject is the default product', async () => {
  const pending = await Meeting.create({ type: 'online', status: 'pending', company: 'X', name: 'Y', email: 'y@example.com', topic: 'quote', requestedStartAt: new Date(), startAt: new Date() });
  const res = response();
  await convertMeetingToQuote({ params: { id: String(pending._id) }, body: {}, admin }, res);
  assert.equal(res.code, 409);

  quotes.reset();
  const meeting = await held();
  const ok = response();
  await convertMeetingToQuote({ params: { id: String(meeting._id) }, body: {}, admin }, ok);
  assert.equal(ok.code, 201);
  assert.equal(quotes.store[0].product, 'Ürün bilgisi – Dikey tank');
  assert.equal(quotes.store[0].quantity, null);
});
