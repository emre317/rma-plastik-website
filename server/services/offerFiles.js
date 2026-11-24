import fs from 'node:fs';
import path from 'node:path';

import { QUOTE_FILES_ROOT } from '../middleware/projectFiles.js';

/*
  The PDFs a proforma was last sent with (the proforma itself and its
  datasheets), kept outside the public /uploads folder next to the other
  customer documents (QUOTE_FILES_ROOT; see middleware/projectFiles.js), so a
  reminder can re-send the exact same files without the browser that made
  them (the datasheet is captured client-side from the live design — there
  is no headless browser on this server to redo that; see
  client/src/pages/ProductDatasheet/datasheetPdf.js). The proforma PDF
  itself could in principle be rebuilt, but keeping both together is simpler
  and guarantees the reminder matches what the customer was actually sent.

  Only the latest send is kept; an older revision's files are replaced.
*/

const OFFERS_ROOT = path.join(QUOTE_FILES_ROOT, 'offers');

function offerDir(quoteId) {
  return path.join(OFFERS_ROOT, String(quoteId));
}

export function saveOfferAttachments(quoteId, pdf, datasheets = []) {
  const dir = offerDir(quoteId);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'proforma.pdf'), pdf);

  datasheets.forEach((file, index) => {
    fs.writeFileSync(path.join(dir, `datasheet-${index}.pdf`), file.content);
    fs.writeFileSync(path.join(dir, `datasheet-${index}.name.txt`), file.filename || `teknik-foy-${index}.pdf`, 'utf8');
  });
}

/* { pdf, datasheets: [{ filename, content, contentType }] }, or null when nothing was saved for this quote. */
export function loadOfferAttachments(quoteId) {
  const dir = offerDir(quoteId);
  const pdfPath = path.join(dir, 'proforma.pdf');
  if (!fs.existsSync(pdfPath)) return null;

  const datasheets = fs
    .readdirSync(dir)
    .map((name) => /^datasheet-(\d+)\.pdf$/.exec(name))
    .filter(Boolean)
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .map(([fileName, index]) => {
      const namePath = path.join(dir, `datasheet-${index}.name.txt`);
      const filename = fs.existsSync(namePath) ? fs.readFileSync(namePath, 'utf8') : fileName;
      return { filename, content: fs.readFileSync(path.join(dir, fileName)), contentType: 'application/pdf' };
    });

  return { pdf: fs.readFileSync(pdfPath), datasheets };
}

export function removeOfferAttachments(quoteId) {
  fs.rmSync(offerDir(quoteId), { recursive: true, force: true });
}
