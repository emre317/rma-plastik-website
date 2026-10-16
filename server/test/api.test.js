import test from 'node:test';
import assert from 'node:assert/strict';

// Production-like settings before the app is loaded
process.env.NODE_ENV = 'production';
process.env.CLIENT_URL = 'https://www.rmaplastik.com';
process.env.CONTENT_API_TOKEN = 'c'.repeat(32);
process.env.PUBLISH_CALLBACK_TOKEN = 'p'.repeat(32);

const { default: app } = await import('../app.js');

const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

const get = (path, init) => fetch(`${base}${path}`, init);

test('health answers with and without the /api prefix (Passenger base URI)', async () => {
  for (const path of ['/api/health', '/health']) {
    const response = await get(path);
    const body = await response.json();
    assert.equal(response.status, 503, path);
    assert.equal(body.status, 'DEGRADED');
    assert.equal(body.database, 'disconnected');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});

test('security headers and no framework banner', async () => {
  const response = await get('/api/health');
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('strict-transport-security') || '', /max-age=31536000/);
});

test('content snapshot is closed without the build token', async () => {
  assert.equal((await get('/api/content')).status, 401);
  assert.equal((await get('/api/content', { headers: { Authorization: `Bearer ${'x'.repeat(32)}` } })).status, 401);
});

test('publish callback is closed without its token', async () => {
  const response = await get('/api/publish/callback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(response.status, 401);
});

test('admin endpoints need a login', async () => {
  for (const path of ['/api/admin/publish', '/api/admin/product-groups', '/api/quote', '/api/admin/users']) {
    const response = await get(path);
    assert.equal(response.status, 401, path);
  }
});

test('CORS allows the site origin only', async () => {
  const allowed = await get('/api/health', { headers: { Origin: 'https://www.rmaplastik.com' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://www.rmaplastik.com');
  const other = await get('/api/health', { headers: { Origin: 'https://evil.example' } });
  assert.equal(other.headers.get('access-control-allow-origin'), null);
});

test('unknown API paths and bad JSON give short JSON errors', async () => {
  const missing = await get('/api/nope');
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).success, false);
  const bad = await get('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(bad.status, 400);
  assert.deepEqual(await bad.json(), { success: false, message: 'Invalid JSON body.' });
});
