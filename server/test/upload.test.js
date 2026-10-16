import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rma-uploads-'));
process.env.UPLOAD_DIR = dir;

const { default: express } = await import('express');
const { uploadProductImage, UPLOAD_ROOT } = await import('../middleware/upload.js');

const app = express();
app.post('/upload', uploadProductImage);
const server = app.listen(0);
const url = `http://127.0.0.1:${server.address().port}/upload`;
test.after(() => { server.close(); fs.rmSync(dir, { recursive: true, force: true }); });

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);

async function send(bytes, type, name = 'photo.png') {
  const form = new FormData();
  form.append('image', new Blob([bytes], { type }), name);
  const response = await fetch(url, { method: 'POST', body: form });
  return { status: response.status, body: await response.json() };
}

const files = () => fs.readdirSync(path.join(dir, 'products'));

test('uploads go to UPLOAD_DIR with a random name', async () => {
  assert.equal(UPLOAD_ROOT, path.resolve(dir));
  const { status, body } = await send(PNG, 'image/png', '../../etc/passwd.png');
  assert.equal(status, 201);
  assert.match(body.data.url, /^\/uploads\/products\/[0-9a-f-]{36}\.png$/);
  assert.equal(files().length, 1);
});

test('a file that is not really an image is rejected and deleted', async () => {
  const { status } = await send(Buffer.from('<?php system($_GET["c"]); ?>'), 'image/png', 'shell.png');
  assert.equal(status, 400);
  assert.equal(files().length, 1);
});

test('other types and oversized files are rejected', async () => {
  assert.equal((await send(Buffer.from('GIF89a'), 'image/gif', 'a.gif')).status, 400);
  assert.equal((await send(Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]), 'image/png')).status, 400);
  assert.equal(files().length, 1);
});
