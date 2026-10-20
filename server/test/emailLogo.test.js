import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import nodemailer from 'nodemailer';

import { prepareMessage } from '../services/mailer.js';
import { buildCustomerConfirmation, buildOfferEmail, buildQuoteEmail } from '../services/quoteEmail.js';

process.env.CLIENT_URL = 'https://www.rmaplastik.com';
process.env.SMTP_USER = 'web@rmaplastik.com';

const quote = {
  _id: '64b0000000000000000000aa', company: 'Akdeniz Gıda', name: 'Ali Veli', email: 'ali@example.com',
  phone: '+90 532 000 00 00', country: 'Türkiye', product: 'RD 5000', language: 'tr', createdAt: new Date(), items: [],
};
const offer = {
  language: 'tr', currency: 'USD', revision: 1, vatRate: 20, incoterm: 'EXW',
  lines: [{ description: 'RD 5000', quantity: 1, unitPrice: 1000, discount: 0 }],
};

const emails = async () => ({
  'sales notification': buildQuoteEmail(quote),
  'customer confirmation (tr)': buildCustomerConfirmation(quote),
  'customer confirmation (ar)': buildCustomerConfirmation({ ...quote, language: 'ar' }),
  'proforma e-mail': await buildOfferEmail(quote, offer),
});

test('every e-mail header shows the logo instead of plain text', async () => {
  for (const [name, mail] of Object.entries(await emails())) {
    assert.match(mail.html, /<img src="cid:rma-logo@rmaplastik\.com" alt="RMA Plastik"/, name);
    assert.ok(!mail.html.includes('RMA <span style="color:#e4173a;">Plastik</span>'), `${name}: old text logo`);
  }
});

test('the logo file is embedded in the message (also when remote images are blocked)', async () => {
  const mail = buildCustomerConfirmation(quote);
  const message = prepareMessage({ to: 'ali@example.com', ...mail });
  const logo = message.attachments.find((item) => item.cid === 'rma-logo@rmaplastik.com');
  assert.ok(logo && fs.existsSync(logo.path), 'logo attachment with an existing file');

  const out = await nodemailer.createTransport({ streamTransport: true, buffer: true }).sendMail(message);
  const mime = out.message.toString();
  assert.match(mime, /Content-ID: <rma-logo@rmaplastik\.com>/);
  assert.match(mime, /Content-Type: image\/png/);
  assert.match(mime, /^From: RMA Plastik <web@rmaplastik\.com>$/m);
});

test('other attachments stay, and messages without the logo get no extra file', () => {
  const pdf = { filename: 'RMA-PF.pdf', content: Buffer.from('%PDF-1.4'), contentType: 'application/pdf' };
  const withLogo = prepareMessage({ html: '<img src="cid:rma-logo@rmaplastik.com">', attachments: [pdf] });
  assert.deepEqual(withLogo.attachments.map((item) => item.filename), ['RMA-PF.pdf', 'rma-plastik.png']);
  assert.equal(prepareMessage({ html: '<p>x</p>' }).attachments.length, 0);
});
