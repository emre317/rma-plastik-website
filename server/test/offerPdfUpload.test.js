import test from 'node:test';
import assert from 'node:assert/strict';

const { default: express } = await import('express');
const { offerPdfUpload } = await import('../middleware/upload.js');

const app = express();
app.post('/offer', offerPdfUpload, (req, res) => {
  res.status(200).json({
    pdf: req.files?.pdf?.[0]?.originalname || null,
    datasheets: (req.files?.datasheets || []).map((file) => file.originalname),
  });
});
const server = app.listen(0);
const url = `http://127.0.0.1:${server.address().port}/offer`;
test.after(() => server.close());

const PDF = Buffer.from('%PDF-1.4 fixture');
const NOT_PDF = Buffer.from('<?php system($_GET["c"]); ?>');

async function send(fields) {
  const form = new FormData();
  fields.forEach(([field, bytes, name]) => form.append(field, new Blob([bytes], { type: 'application/pdf' }), name));
  const response = await fetch(url, { method: 'POST', body: form });
  return { status: response.status, body: await response.json() };
}

test('the proforma PDF and its datasheets are all parsed under their own field', async () => {
  const { status, body } = await send([
    ['pdf', PDF, 'PF-AB12CD-R1.pdf'],
    ['datasheets', PDF, 'RD-5000 - Teknik Föy.pdf'],
    ['datasheets', PDF, 'RD-1000 - Teknik Föy.pdf'],
  ]);

  assert.equal(status, 200);
  assert.equal(body.pdf, 'PF-AB12CD-R1.pdf');
  assert.deepEqual(body.datasheets, ['RD-5000 - Teknik Föy.pdf', 'RD-1000 - Teknik Föy.pdf']);
});

test('sending only the proforma PDF, with no datasheets, is fine', async () => {
  const { status, body } = await send([['pdf', PDF, 'PF-AB12CD-R1.pdf']]);
  assert.equal(status, 200);
  assert.deepEqual(body.datasheets, []);
});

test('a file that is not really a PDF is rejected, proforma or datasheet alike', async () => {
  assert.equal((await send([['pdf', NOT_PDF, 'fake.pdf']])).status, 400);
  assert.equal((await send([['pdf', PDF, 'ok.pdf'], ['datasheets', NOT_PDF, 'fake.pdf']])).status, 400);
});

test('more than the allowed number of datasheets is rejected', async () => {
  const fields = [['pdf', PDF, 'ok.pdf'], ...Array.from({ length: 9 }, (_, i) => ['datasheets', PDF, `sheet-${i}.pdf`])];
  assert.equal((await send(fields)).status, 400);
});
