import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rma-quote-files-'));
process.env.QUOTE_FILES_DIR = dir;

const { loadOfferAttachments, removeOfferAttachments, saveOfferAttachments } = await import('../services/offerFiles.js');

test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('nothing was saved for a quote that never had an offer sent', () => {
  assert.equal(loadOfferAttachments('000000000000000000000000'), null);
});

test('the proforma and its datasheets round-trip, with their original filenames kept', () => {
  const pdf = Buffer.from('%PDF-1.4 proforma');
  const datasheets = [
    { filename: 'RD 5002 - Teknik Föy.pdf', content: Buffer.from('%PDF-1.4 sheet-1') },
    { filename: 'RD 1000 - Teknik Föy.pdf', content: Buffer.from('%PDF-1.4 sheet-2') },
  ];

  saveOfferAttachments('quote-1', pdf, datasheets);
  const loaded = loadOfferAttachments('quote-1');

  assert.ok(loaded.pdf.equals(pdf));
  assert.equal(loaded.datasheets.length, 2);
  assert.equal(loaded.datasheets[0].filename, 'RD 5002 - Teknik Föy.pdf');
  assert.ok(loaded.datasheets[0].content.equals(datasheets[0].content));
  assert.equal(loaded.datasheets[1].filename, 'RD 1000 - Teknik Föy.pdf');
});

test('saving again (a resend) replaces the previous files, not appends to them', () => {
  saveOfferAttachments('quote-1', Buffer.from('%PDF-1.4 proforma v2'), []);
  const loaded = loadOfferAttachments('quote-1');
  assert.equal(loaded.pdf.toString(), '%PDF-1.4 proforma v2');
  assert.equal(loaded.datasheets.length, 0);
});

test('removeOfferAttachments clears everything for a quote', () => {
  saveOfferAttachments('quote-2', Buffer.from('%PDF-1.4'), []);
  assert.ok(loadOfferAttachments('quote-2'));
  removeOfferAttachments('quote-2');
  assert.equal(loadOfferAttachments('quote-2'), null);
});
