import test from 'node:test';
import assert from 'node:assert/strict';

import { matchesSignature } from '../middleware/upload.js';
import { tokenMatches, requireContentToken, requireCallbackToken } from '../middleware/serviceAuth.js';
import { checkEnvironment, publishMode } from '../config/env.js';
import { redactUri } from '../config/db.js';
import { sanitizeLog } from '../services/publisher.js';

const res = () => {
  const r = { code: 200, body: null, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } };
  return r;
};
const req = (authorization = '', query = {}) => ({ get: (name) => (name.toLowerCase() === 'authorization' ? authorization : ''), query });

function withEnv(values, fn) {
  const saved = {};
  Object.keys(values).forEach((key) => { saved[key] = process.env[key]; if (values[key] === undefined) delete process.env[key]; else process.env[key] = values[key]; });
  try { return fn(); } finally {
    Object.keys(saved).forEach((key) => { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; });
  }
}

test('image uploads must match their declared type', () => {
  assert.ok(matchesSignature('image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0])));
  assert.ok(matchesSignature('image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])));
  assert.ok(matchesSignature('image/webp', Buffer.from('RIFF\x00\x00\x00\x00WEBPVP8 ', 'latin1')));
  assert.equal(matchesSignature('image/png', Buffer.from('<html><script>')), false);
  assert.equal(matchesSignature('image/jpeg', Buffer.from([0x89, 0x50, 0x4e, 0x47])), false);
  assert.equal(matchesSignature('image/gif', Buffer.from('GIF89a')), false);
});

test('service tokens are compared exactly', () => {
  assert.ok(tokenMatches('a'.repeat(32), 'a'.repeat(32)));
  assert.equal(tokenMatches('a'.repeat(32), 'b'.repeat(32)), false);
  assert.equal(tokenMatches('', 'x'), false);
});

test('content snapshot needs the token (and is closed in production without one)', () => {
  const token = 't'.repeat(32);
  withEnv({ CONTENT_API_TOKEN: token, NODE_ENV: 'production' }, () => {
    let r = res(); let passed = false;
    requireContentToken(req(''), r, () => { passed = true; });
    assert.equal(r.code, 401); assert.equal(passed, false);
    r = res(); requireContentToken(req(`Bearer ${token}`), r, () => { passed = true; });
    assert.equal(passed, true);
  });
  withEnv({ CONTENT_API_TOKEN: undefined, NODE_ENV: 'production' }, () => {
    const r = res(); requireContentToken(req(''), r, () => {});
    assert.equal(r.code, 503);
  });
  withEnv({ CONTENT_API_TOKEN: undefined, NODE_ENV: 'development' }, () => {
    let passed = false; requireContentToken(req(''), res(), () => { passed = true; });
    assert.equal(passed, true);
  });
});

test('publish callback needs its own token', () => {
  withEnv({ PUBLISH_CALLBACK_TOKEN: undefined }, () => {
    const r = res(); requireCallbackToken(req('Bearer x'), r, () => {});
    assert.equal(r.code, 503);
  });
  withEnv({ PUBLISH_CALLBACK_TOKEN: 'c'.repeat(32) }, () => {
    const r = res(); requireCallbackToken(req(`Bearer ${'d'.repeat(32)}`), r, () => {});
    assert.equal(r.code, 401);
  });
});

test('production environment check', () => {
  const base = {
    NODE_ENV: 'production', MONGODB_URI: 'mongodb+srv://u:p@cluster0.example.mongodb.net/rma', JWT_SECRET: 'x'.repeat(40),
    CLIENT_URL: 'https://www.rmaplastik.com', TRUST_PROXY: '1', CONTENT_API_TOKEN: 'c'.repeat(32), PUBLISH_CALLBACK_TOKEN: 'p'.repeat(32),
    GITHUB_TOKEN: 'g', GITHUB_REPOSITORY: 'emre317/rma-plastik-website', UPLOAD_DIR: '/home/u/rma-data/uploads',
    SMTP_HOST: 'h', SMTP_USER: 'u', SMTP_PASS: 'p', PUBLISH_MODE: undefined,
  };
  withEnv(base, () => {
    const { errors, warnings } = checkEnvironment();
    assert.deepEqual(errors, []);
    assert.deepEqual(warnings, []);
    assert.equal(publishMode(), 'github');
  });
  withEnv({ ...base, JWT_SECRET: 'short', CONTENT_API_TOKEN: undefined }, () => {
    const { errors } = checkEnvironment();
    assert.ok(errors.some((e) => e.includes('JWT_SECRET')));
    assert.ok(errors.some((e) => e.includes('CONTENT_API_TOKEN')));
  });
  withEnv({ ...base, CLIENT_URL: 'http://localhost:5173' }, () => {
    assert.ok(checkEnvironment().warnings.length >= 2);
  });
  withEnv({ NODE_ENV: 'development', PUBLISH_MODE: undefined }, () => assert.equal(publishMode(), 'local'));
});

test('secrets are hidden in logs and messages', () => {
  assert.equal(redactUri('mongodb+srv://user:pa55@cluster0.x.mongodb.net/db'), 'mongodb+srv://***@cluster0.x.mongodb.net/db');
  const log = sanitizeLog('Authorization: Bearer abc123\nghp_' + 'a'.repeat(36) + '\nmongodb://u:p@host/db\nSMTP_PASS=hunter2');
  assert.ok(!log.includes('abc123'));
  assert.ok(!log.includes('ghp_'));
  assert.ok(!log.includes('u:p@'));
  assert.ok(!log.includes('hunter2'));
});
