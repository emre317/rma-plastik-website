import fs from 'node:fs';
import path from 'node:path';

import { publicFamilies } from '../controllers/productFamilyController.js';
import { UPLOAD_ROOT } from '../middleware/upload.js';

/*
  Proforma e-mails attach the technical drawing of every catalogue model that
  was recognised in the offer's lines (the sales team does not have to
  remember to attach it separately). A model is recognised by its code (e.g.
  "RD-5000") appearing in a line's name or details; a line that does not
  match any catalogue model (freight, moulds, a fully custom product...) is
  simply skipped.

  The matching technical datasheet is NOT built here: it is captured in the
  browser from the exact same design as the public /datasheet page
  (client/src/pages/ProductDatasheet/datasheetPdf.js, used by
  AdminQuoteOffer.jsx when sending) and uploaded alongside the proforma PDF,
  so the attachment is pixel-identical to what a visitor could save from the
  site themselves. matchFromFamilies here mirrors
  client/src/data/offerAttachments.js' client-side matcher; keep both in
  sync.
*/

function normalizeCode(value) {
  return String(value || '')
    .toLocaleUpperCase('tr')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

let cache = null;
let cacheAt = 0;
const CACHE_MS = 60_000;

async function catalog() {
  if (cache && Date.now() - cacheAt < CACHE_MS) return cache;
  cache = await publicFamilies();
  cacheAt = Date.now();
  return cache;
}

/*
  Best catalogue model whose code appears in `text` (a free-text offer line's
  name + details), or null. Pure function so it can be unit-tested without a
  database: `families` is the public catalogue shape (see toPublicFamily).
*/
export function matchFromFamilies(families, text) {
  const haystack = normalizeCode(text);
  if (haystack.length < 3) return null;

  let best = null;

  for (const family of families) {
    for (const row of family.rows || []) {
      const code = normalizeCode(row.code);
      if (code.length < 3 || !haystack.includes(code)) continue;
      if (!best || code.length > best.codeLength) best = { family, row, codeLength: code.length };
    }
  }

  return best ? { family: best.family, row: best.row } : null;
}

export async function matchCatalogItem(text) {
  return matchFromFamilies(await catalog(), text);
}

function uploadsDiskPath(url) {
  const match = /^\/uploads\/(.+)$/.exec(url || '');
  return match ? path.join(UPLOAD_ROOT, match[1]) : '';
}

const DRAWING_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/* The model's own technical drawing file, else the family's; null when there is none on disk. */
export function drawingAttachment(family, row) {
  const url = row.drawing || family.drawing || '';
  const ext = /\.(png|jpg|pdf|docx)$/i.exec(url)?.[1]?.toLowerCase();
  if (!ext) return null;

  const diskPath = uploadsDiskPath(url);
  if (!diskPath || !fs.existsSync(diskPath)) return null;

  return {
    filename: `${row.code} - Teknik Çizim.${ext}`,
    content: fs.readFileSync(diskPath),
    contentType: DRAWING_MIME[ext],
  };
}

const MAX_MATCHED_PRODUCTS = 8;

/*
  Drawing attachments for every catalogue model recognised among an offer's
  lines (deduplicated, capped so a long proforma cannot balloon the e-mail).
  A line with no match contributes nothing.
*/
export async function collectDrawingAttachments(offer) {
  const families = await catalog();
  const seen = new Set();
  const attachments = [];

  for (const line of offer?.lines || []) {
    if (seen.size >= MAX_MATCHED_PRODUCTS) break;

    const found = matchFromFamilies(families, `${line.name || ''} ${line.details || ''}`);
    if (!found) continue;

    const key = `${found.family.id}|${found.row.code}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const drawing = drawingAttachment(found.family, found.row);
    if (drawing) attachments.push(drawing);
  }

  return attachments;
}
