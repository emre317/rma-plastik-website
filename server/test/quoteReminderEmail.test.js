import test from 'node:test';
import assert from 'node:assert/strict';

import { buildReminderEmail } from '../services/quoteEmail.js';

const quote = { _id: '65a1b2c3d4e5f60718293a4b', name: 'Ahmet Yılmaz', email: 'ahmet@musteri-firma.com' };

const offer = {
  language: 'tr',
  currency: 'TRY',
  revision: 1,
  lines: [{ name: 'RD 5002', quantity: 1, unitPrice: 18500 }],
  sentAt: '2026-11-10T09:00:00Z',
  validUntil: '2026-12-20',
  preparedBy: 'Ayşe Demir – İhracat',
  reminders: [],
};

test('the first reminder mentions the proforma number and total, no "previous reminder" line', async () => {
  const { subject, html, text } = await buildReminderEmail(quote, offer, {}, 0);
  assert.match(subject, /^Hatırlatma: PF-/);
  assert.ok(!/(\d+)\./.test(subject)); // no "(2.)" suffix on the first one
  assert.ok(html.includes('Ahmet Yılmaz'));
  assert.ok(html.includes('₺18.500,00'));
  assert.ok(html.includes('Ayşe Demir'));
  assert.ok(!html.includes('Daha önce'));
  assert.ok(text.includes('Proforma faturamızı tekrar ekte bulabilirsiniz.'));
});

test('a later reminder is numbered and mentions the earlier one', async () => {
  const withHistory = { ...offer, reminders: [{ sentAt: '2026-11-14T09:00:00Z', kind: 'auto' }] };
  const { subject, html } = await buildReminderEmail(quote, withHistory, {}, 1);
  assert.match(subject, /^Hatırlatma \(2\.\): PF-/);
  assert.ok(html.includes('Daha önce'));
  assert.ok(html.includes('14 Kasım 2026'));
});

test('an English offer gets the English reminder copy', async () => {
  const { subject, html } = await buildReminderEmail(quote, { ...offer, language: 'en' }, {}, 0);
  assert.match(subject, /^Reminder: our offer PF-/);
  assert.ok(html.includes('Dear Ahmet'));
  assert.ok(html.includes('kindly follow up'));
});

test('an Arabic offer gets the Arabic reminder copy, right-to-left', async () => {
  const { html } = await buildReminderEmail(quote, { ...offer, language: 'ar' }, {}, 0);
  assert.ok(html.includes('dir="rtl"'));
  assert.ok(html.includes('تذكير'));
});
