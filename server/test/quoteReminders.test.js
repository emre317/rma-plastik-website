import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { memoryModel } from './helpers/memoryModels.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rma-quote-files-'));
process.env.QUOTE_FILES_DIR = dir;
delete process.env.SMTP_HOST;
delete process.env.QUOTE_REMINDERS;
delete process.env.QUOTE_REMINDER_DAYS;

const { default: QuoteRequest } = await import('../models/QuoteRequest.js');
const quotes = memoryModel(QuoteRequest);
const { saveOfferAttachments } = await import('../services/offerFiles.js');
const { isQuoteReminderDue, reminderDays, remindersEnabled, sendDueQuoteReminders } = await import('../services/quoteReminders.js');

test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

const now = new Date('2026-11-24T09:00:00Z');
const daysAgo = (d) => new Date(now.getTime() - d * 24 * 3600 * 1000);

const make = (data = {}) => QuoteRequest.create({
  company: 'Akdeniz Gıda', name: 'Ali Veli', email: 'ali@example.com', phone: '+90 532 000 00 00',
  product: 'RD 5000', status: 'quoted',
  offer: { lines: [{ name: 'RD 5000', quantity: 1, unitPrice: 1000 }], savedAt: daysAgo(5), sentAt: daysAgo(5), sentTo: 'ali@example.com' },
  ...data,
});

test('reminderDays() and remindersEnabled() read their env vars with sane defaults', () => {
  assert.equal(reminderDays(), 4);
  assert.equal(remindersEnabled(), true);
  process.env.QUOTE_REMINDER_DAYS = '7';
  assert.equal(reminderDays(), 7);
  process.env.QUOTE_REMINDER_DAYS = '0';
  assert.equal(reminderDays(), 4); // out of range falls back
  delete process.env.QUOTE_REMINDER_DAYS;
  process.env.QUOTE_REMINDERS = 'false';
  assert.equal(remindersEnabled(), false);
  delete process.env.QUOTE_REMINDERS;
});

test('isQuoteReminderDue: sent, open, past the cutoff, nothing sent yet', async () => {
  assert.equal(isQuoteReminderDue(await make(), now), true);
  assert.equal(isQuoteReminderDue(await make({ offer: { sentAt: daysAgo(1) } }), now), false); // too soon
  assert.equal(isQuoteReminderDue(await make({ offer: { sentAt: null } }), now), false); // never sent
  assert.equal(isQuoteReminderDue(await make({ outcome: 'won' }), now), false); // already decided
  assert.equal(isQuoteReminderDue(await make({ status: 'closed' }), now), false);
  assert.equal(isQuoteReminderDue(await make({ offer: { sentAt: daysAgo(5), autoReminderAt: daysAgo(1) } }), now), false); // already auto-reminded
  assert.equal(isQuoteReminderDue(await make({ offer: { sentAt: daysAgo(5), reminders: [{ sentAt: daysAgo(2), kind: 'manual' }] } }), now), false); // sales already followed up
});

test('QUOTE_REMINDERS=false and no SMTP configured both turn it off without touching anything', async () => {
  quotes.reset();
  const quote = await make();
  saveOfferAttachments(quote._id, Buffer.from('%PDF-1.4'), []);

  // No SMTP in this test environment
  assert.equal(await sendDueQuoteReminders(now), 0);
  assert.equal((await QuoteRequest.findById(quote._id)).offer.autoReminderAt, null);

  process.env.QUOTE_REMINDERS = 'false';
  assert.equal(await sendDueQuoteReminders(now), 0);
  delete process.env.QUOTE_REMINDERS;
});

test('a due quote with no saved attachments is skipped (nothing to attach, claim stays free)', async () => {
  quotes.reset();
  await make(); // no saveOfferAttachments call for this one
  assert.equal(await sendDueQuoteReminders(now), 0);
});
