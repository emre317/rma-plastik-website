import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rma-uploads-'));
process.env.UPLOAD_DIR = dir;

const { default: express } = await import('express');
const { uploadProductImage, uploadProductDrawing, drawingType, UPLOAD_ROOT } = await import('../middleware/upload.js');

const app = express();
app.post('/upload', uploadProductImage);
app.post('/drawing', uploadProductDrawing);
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

/* ---------- Technical drawings ---------- */

const PDF = Buffer.from('%PDF-1.7\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\n');
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
// File names are stored as plain text inside a ZIP, which is what the check reads
const zipWith = (...names) => Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(26), ...names.map((name) => Buffer.from(name))]);
const DOCX = zipWith('[Content_Types].xml', 'word/document.xml');

async function sendDrawing(bytes, name, type = 'application/octet-stream') {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type }), name);
  const response = await fetch(url.replace('/upload', '/drawing'), { method: 'POST', body: form });
  return { status: response.status, body: await response.json() };
}

const drawings = () => fs.readdirSync(path.join(dir, 'drawings'));

test('technical drawings: PNG, JPG, PDF and DOCX are stored under a random name', async () => {
  for (const [bytes, name, ext] of [[PNG, 'cizim.PNG', 'png'], [JPG, 'cizim.jpeg', 'jpg'], [PDF, '../../x.pdf', 'pdf'], [DOCX, 'cizim.docx', 'docx']]) {
    const { status, body } = await sendDrawing(bytes, name);
    assert.equal(status, 201, name);
    assert.match(body.data.url, new RegExp(`^/uploads/drawings/[0-9a-f-]{36}\\.${ext}$`));
    assert.equal(body.data.type, ext);
  }
  assert.equal(drawings().length, 4);
  assert.equal(drawings().some((file) => file.endsWith('.upload')), false);
});

test('technical drawings: the content decides, not the name; anything else is deleted', async () => {
  // A PDF named .png is kept as what it really is
  assert.match((await sendDrawing(PDF, 'aslinda-pdf.png')).body.data.url, /\.pdf$/);

  assert.equal((await sendDrawing(Buffer.from('<html><script>alert(1)</script>'), 'sayfa.pdf')).status, 400);
  assert.equal((await sendDrawing(zipWith('[Content_Types].xml', 'xl/workbook.xml'), 'tablo.docx')).status, 400);
  assert.equal((await sendDrawing(zipWith('[Content_Types].xml', 'word/document.xml', 'word/vbaProject.bin'), 'makro.docx')).status, 400);
  assert.equal((await sendDrawing(PDF, 'cizim.exe')).status, 400);
  assert.equal((await sendDrawing(PDF, 'cizim.dwg')).status, 400);
  assert.equal(drawings().length, 5);
  assert.equal(drawingType(Buffer.from('GIF89a')), '');
});
