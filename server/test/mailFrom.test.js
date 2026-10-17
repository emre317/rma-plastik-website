import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';

import { mailFrom } from '../services/mailer.js';

function withEnv(values, fn) {
  const saved = {};
  Object.keys(values).forEach((key) => { saved[key] = process.env[key]; if (values[key] === undefined) delete process.env[key]; else process.env[key] = values[key]; });
  try { return fn(); } finally {
    Object.keys(saved).forEach((key) => { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; });
  }
}

const expected = { name: 'RMA Plastik', address: 'web@rmaplastik.com' };

test('the sender name survives every way the hosting panel may store MAIL_FROM', () => {
  const variants = [
    '"RMA Plastik" <web@rmaplastik.com>',
    'RMA Plastik <web@rmaplastik.com>',
    '\\"RMA Plastik\\" <web@rmaplastik.com>',
    '\'"RMA Plastik" <web@rmaplastik.com>\'',
    '"RMA Plastik"',
    'RMA Plastik',
    undefined,
  ];
  for (const value of variants) {
    withEnv({ MAIL_FROM: value, SMTP_USER: 'web@rmaplastik.com' }, () => {
      assert.deepEqual(mailFrom(), expected, String(value));
    });
  }
});

test('a bare address gets the default name; another name is kept', () => {
  withEnv({ MAIL_FROM: 'web@rmaplastik.com', SMTP_USER: 'web@rmaplastik.com' }, () => assert.deepEqual(mailFrom(), expected));
  withEnv({ MAIL_FROM: 'RMA Plastik Satış <web@rmaplastik.com>', SMTP_USER: 'web@rmaplastik.com' }, () => {
    assert.deepEqual(mailFrom(), { name: 'RMA Plastik Satış', address: 'web@rmaplastik.com' });
  });
});

test('the e-mail header shows the name', async () => {
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
  for (const value of ['"RMA Plastik" <web@rmaplastik.com>', '\\"RMA Plastik\\" <web@rmaplastik.com>']) {
    const from = withEnv({ MAIL_FROM: value, SMTP_USER: 'web@rmaplastik.com' }, () => mailFrom());
    const info = await transport.sendMail({ from, to: 'info@rmaplastik.com', subject: 'x', text: 'x' });
    assert.match(info.message.toString(), /^From: RMA Plastik <web@rmaplastik\.com>$/m, value);
  }
});
