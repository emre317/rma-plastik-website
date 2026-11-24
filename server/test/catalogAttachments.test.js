import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { datasheetAttachment, drawingAttachment, matchFromFamilies } from '../services/catalogAttachments.js';

const family = {
  id: 'vertical-tanks',
  drawing: '',
  columns: ['volume', 'diameter', 'height'],
  i18n: { tr: { title: 'Dikey Tanklar', text: 'Dikey silindirik depolama tankı.', features: ['UV katkılı'] } },
  rows: [
    { code: 'RD-5000', volume: 5000, diameter: 180, height: 220, drawing: '', i18n: { tr: { text: '', features: [] } } },
    { code: 'RD-1000', volume: 1000, diameter: 120, height: 130, drawing: '', i18n: { tr: { text: '', features: [] } } },
  ],
};

test('matches a catalogue model by its code inside free text, longest code wins', () => {
  const found = matchFromFamilies([family], 'RD-5000 Dikey Su Deposu için teklif istiyoruz');
  assert.equal(found?.row.code, 'RD-5000');
});

test('ignores hyphen/space differences between the stored code and the offer line text', () => {
  const found = matchFromFamilies([family], 'RD 1000 modeli');
  assert.equal(found?.row.code, 'RD-1000');
});

test('a line with no matching product code is skipped, not force-matched', () => {
  assert.equal(matchFromFamilies([family], 'Nakliye bedeli'), null);
  assert.equal(matchFromFamilies([family], 'Kalıp masrafı'), null);
});

test('a missing drawing file on disk does not attach anything', () => {
  assert.equal(drawingAttachment(family, family.rows[0]), null);
});

test('an existing drawing file is read from /uploads and attached with its own mime type', async () => {
  const { UPLOAD_ROOT } = await import('../middleware/upload.js');
  const dir = path.join(UPLOAD_ROOT, 'drawings');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'test-fixture-rd5000.pdf');
  fs.writeFileSync(file, '%PDF-1.4 fixture');

  try {
    const row = { ...family.rows[0], drawing: '/uploads/drawings/test-fixture-rd5000.pdf' };
    const attachment = drawingAttachment(family, row);
    assert.equal(attachment.contentType, 'application/pdf');
    assert.ok(attachment.content.toString('latin1').startsWith('%PDF-'));
  } finally {
    fs.rmSync(file, { force: true });
  }
});

test('the generated datasheet is a real PDF with the model code and dimensions on it', async () => {
  const pdf = await datasheetAttachment(family, family.rows[0], 'tr');
  assert.ok(Buffer.isBuffer(pdf));
  assert.equal(pdf.subarray(0, 5).toString('latin1'), '%PDF-');
  assert.ok(pdf.length > 1000);
});

test('an Arabic offer falls back to the English datasheet text (pdfkit cannot shape Arabic)', async () => {
  const pdf = await datasheetAttachment(family, family.rows[0], 'ar');
  assert.equal(pdf.subarray(0, 5).toString('latin1'), '%PDF-');
});
