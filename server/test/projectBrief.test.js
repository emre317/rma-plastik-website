import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { memoryModel } from './helpers/memoryModels.js';

const filesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rma-quote-files-'));
const uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rma-uploads-'));
process.env.QUOTE_FILES_DIR = filesDir;
process.env.UPLOAD_DIR = uploadsDir;
process.env.JWT_SECRET = 'p'.repeat(40);

const models = {};
for (const name of ['AdminUser', 'QuoteRequest', 'AuditLog']) {
  models[name] = (await import(`../models/${name}.js`)).default;
  memoryModel(models[name]);
}
const { AdminUser, QuoteRequest } = models;
const { createToken } = await import('../controllers/authController.js');
const { cleanProject } = await import('../controllers/quoteController.js');
const { buildQuoteEmail } = await import('../services/quoteEmail.js');
const { QUOTE_FILES_ROOT } = await import('../middleware/projectFiles.js');
const { default: app } = await import('../app.js');

const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api/quote`;
test.after(() => {
  server.close();
  fs.rmSync(filesDir, { recursive: true, force: true });
  fs.rmSync(uploadsDir, { recursive: true, force: true });
});

const sales = await AdminUser.create({ name: 'Ayşe', email: 'ayse@rmaplastik.com', password: 'Sifre12345', role: 'sales' });
const content = await AdminUser.create({ name: 'Mehmet', email: 'mehmet@rmaplastik.com', password: 'Sifre12345', role: 'content' });
const admin = await AdminUser.create({ name: 'Emre', email: 'emre@rmaplastik.com', password: 'Sifre12345', role: 'admin' });
const auth = (user) => ({ Authorization: `Bearer ${createToken(user)}` });

const PDF = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
const STEP = Buffer.from('ISO-10303-21;\nHEADER;\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n');
const STL = (() => {
  const buffer = Buffer.alloc(84 + 50 * 2);
  buffer.writeUInt32LE(2, 80);
  return buffer;
})();

const brief = (overrides = {}) => ({
  company: 'Akdeniz Makine',
  name: 'Ali Veli',
  email: 'ali@example.com',
  phone: '+90 532 000 00 00',
  country: 'Türkiye',
  deliveryCity: 'Mersin',
  language: 'en',
  designInput: 'drawing',
  firstOrder: '250',
  notes: 'Prototype first, please.',
  project: {
    type: 'housing',
    stage: 'convert',
    title: 'Pump housing',
    description: 'Housing for a dosing pump, currently made of sheet metal.',
    length: '1200',
    width: 800,
    height: '600,5',
    volume: '',
    material: 'hdpe',
    method: 'Rotasyonel kalıplama',
    colour: 'custom',
    colourNote: 'RAL 5010',
    conditions: ['outdoor', 'chemical', 'unknown'],
    features: ['inserts', 'logo'],
    annualVolume: '250-1000',
    needsPrototype: true,
    timeline: '1-3m',
    nda: true,
  },
  ...overrides,
});

async function send(data, files = []) {
  const form = new FormData();
  form.append('data', typeof data === 'string' ? data : JSON.stringify(data));
  files.forEach(([bytes, name]) => form.append('files', new Blob([bytes]), name));
  const response = await fetch(`${base}/project`, { method: 'POST', body: form });
  return { status: response.status, body: await response.json() };
}

const stored = () => fs.readdirSync(QUOTE_FILES_ROOT);

test('project files are kept outside the public uploads folder', () => {
  assert.equal(QUOTE_FILES_ROOT, path.resolve(filesDir));
  assert.ok(!QUOTE_FILES_ROOT.startsWith(path.resolve(uploadsDir)));
});

test('cleanProject keeps known choices and plain numbers only', () => {
  const { project } = cleanProject(brief().project);
  assert.equal(project.type, 'housing');
  assert.equal(project.length, 1200);
  assert.equal(project.height, 600.5);
  assert.equal(project.volume, null);
  assert.deepEqual(project.conditions, ['outdoor', 'chemical']);
  assert.equal(project.needsPrototype, true);

  assert.match(cleanProject({ description: 'A long enough description' }).error, /type/);
  assert.match(cleanProject({ type: 'tank', description: 'short' }).error, /describe/);
  assert.equal(cleanProject({ type: 'tank', description: 'Twelve chars', length: -5, wall: 5000, stage: 'x' }).project.length, null);
});

test('a brief with drawings becomes a quote request with source "project"', async () => {
  const { status, body } = await send(brief(), [[PDF, 'çizim-v2.pdf'], [STEP, 'housing.STEP'], [STL, 'part.stl']]);
  assert.equal(status, 201, JSON.stringify(body));
  assert.match(body.reference, /^RMA-/);

  const quote = await QuoteRequest.findById(body.requestId);
  assert.equal(quote.source, 'project');
  assert.equal(quote.product, 'Özel Üretim Projesi: Pump housing');
  assert.equal(quote.quantity, 250);
  assert.equal(quote.designInput, 'drawing');
  assert.equal(quote.message, 'Prototype first, please.');
  assert.equal(quote.project.material, 'hdpe');
  assert.equal(quote.project.nda, true);
  assert.equal(quote.project.needsPrototype, true);
  assert.match(buildQuoteEmail(quote.toObject()).text, /Prototip \/ Numune: İstiyor/);
  assert.deepEqual(quote.files.map((file) => file.name), ['çizim-v2.pdf', 'housing.STEP', 'part.stl']);
  assert.deepEqual(quote.files.map((file) => file.type), ['pdf', 'step', 'stl']);
  quote.files.forEach((file) => assert.match(file.id, /^[0-9a-f-]{36}\.[a-z]+$/));
  assert.equal(stored().length, 3);

  // The sales e-mail lists the brief in Turkish
  const mail = buildQuoteEmail(quote.toObject());
  assert.match(mail.subject, /^Yeni özel üretim projesi: Akdeniz Makine – Pump housing/);
  assert.match(mail.text, /Malzeme: HDPE/);
  assert.match(mail.text, /Ölçüler \(U × G × Y\): 1200 × 800 × 600\.5 mm/);
  assert.match(mail.text, /Ekli Dosyalar: 3 dosya/);
});

test('a renamed or unknown file is refused and nothing is kept', async () => {
  const before = stored().length;

  const fake = await send(brief(), [[PDF, 'ok.pdf'], [Buffer.from('<?php system($_GET["c"]); ?>'), 'drawing.pdf']]);
  assert.equal(fake.status, 400);
  assert.match(fake.body.message, /not a valid PDF/);

  assert.equal((await send(brief(), [[Buffer.from('MZ'), 'setup.exe']])).status, 400);
  assert.equal((await send(brief(), [[Buffer.from('solid'), 'a.stl'], [PDF, 'b.pdf'], [PDF, 'c.pdf'], [PDF, 'd.pdf'], [PDF, 'e.pdf'], [PDF, 'f.pdf']])).status, 400);

  assert.equal(stored().length, before);
});

test('an incomplete brief is refused and its files are removed', async () => {
  const before = stored().length;

  const missingType = await send(brief({ project: { description: 'Something to make' } }), [[PDF, 'a.pdf']]);
  assert.equal(missingType.status, 400);

  const missingEmail = await send(brief({ email: '' }), [[PDF, 'a.pdf']]);
  assert.equal(missingEmail.status, 400);

  assert.equal((await send('not json', [[PDF, 'a.pdf']])).status, 400);

  // Files are removed once the answer is sent
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(stored().length, before);
});

test('files are downloads for sales users only', async () => {
  const quote = (await QuoteRequest.find({ source: 'project' }))[0];
  const file = quote.files[0];
  const url = `${base}/${quote._id}/files/${file.id}`;

  assert.equal((await fetch(url)).status, 401);
  assert.equal((await fetch(url, { headers: auth(content) })).status, 403);
  assert.equal((await fetch(`${base}/${quote._id}/files/00000000-0000-0000-0000-000000000000.pdf`, { headers: auth(sales) })).status, 404);
  assert.equal((await fetch(`${base}/${quote._id}/files/..%2F..%2Fapp.js`, { headers: auth(sales) })).status, 404);

  const response = await fetch(url, { headers: auth(sales) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/octet-stream');
  assert.match(response.headers.get('content-disposition') || '', /^attachment;/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), PDF);
});

test('deleting the request deletes its files', async () => {
  const quote = (await QuoteRequest.find({ source: 'project' }))[0];
  const ids = quote.files.map((file) => file.id);

  const response = await fetch(`${base}/${quote._id}`, { method: 'DELETE', headers: auth(admin) });
  assert.equal(response.status, 200);
  ids.forEach((id) => assert.ok(!stored().includes(id)));
});
