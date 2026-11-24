import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import PDFDocument from 'pdfkit';

import { publicFamilies } from '../controllers/productFamilyController.js';
import { UPLOAD_ROOT } from '../middleware/upload.js';

/*
  Proforma e-mails attach the technical drawing and a technical datasheet of
  every catalogue model that was recognised in the offer's lines (the sales
  team does not have to remember to attach them separately). A model is
  recognised by its code (e.g. "RD-5000") appearing in a line's name or
  details; a line that does not match any catalogue model (freight, moulds,
  a fully custom product...) is simply skipped.

  The datasheet itself is generated here as a plain PDF (not a render of the
  public /datasheet page): the production server runs on shared cPanel
  hosting (see docs/hosting-com-tr-deployment.md) where a headless browser
  is not available. DejaVu Sans (bundled under assets/fonts, OFL licensed)
  covers Turkish; Arabic script is not shaped correctly by pdfkit, so an
  Arabic offer gets the English datasheet text instead.
*/

const FONT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../assets/fonts');
const FONT_REGULAR = path.join(FONT_DIR, 'DejaVuSans.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'DejaVuSans-Bold.ttf');

const COLUMN_LABELS = {
  tr: {
    volume: 'Hacim (lt)', diameter: 'Çap (cm)', height: 'Yükseklik (cm)', length: 'Uzunluk (cm)', width: 'Genişlik (cm)',
    cap: 'Kapak çapı (cm)', outlet: 'Çıkış (inç)', wheel: 'Teker (mm)', conical: 'Konik yükseklik (cm)', reducer: 'Redüktör',
    upperLength: 'Üst uzunluk (cm)', bottomLength: 'Alt uzunluk (cm)', upperDiameter: 'Üst çap (cm)', bottomDiameter: 'Alt çap (cm)',
    camber: 'Bombe yüksekliği (cm)', throat: 'Boğaz yüksekliği (cm)', weight: 'Ağırlık (kg)', lengthOrHeight: 'Boy (cm)', depth: 'Derinlik (cm)',
  },
  en: {
    volume: 'Volume (lt)', diameter: 'Diameter (cm)', height: 'Height (cm)', length: 'Length (cm)', width: 'Width (cm)',
    cap: 'Cap diameter (cm)', outlet: 'Outlet (inch)', wheel: 'Wheel (mm)', conical: 'Conical height (cm)', reducer: 'Reducer',
    upperLength: 'Upper length (cm)', bottomLength: 'Bottom length (cm)', upperDiameter: 'Upper diameter (cm)', bottomDiameter: 'Bottom diameter (cm)',
    camber: 'Camber height (cm)', throat: 'Throat height (cm)', weight: 'Weight (kg)', lengthOrHeight: 'Length / height (cm)', depth: 'Depth (cm)',
  },
};

const SHEET_TEXT = {
  tr: {
    title: 'Teknik Föy', code: 'Ürün Kodu', family: 'Ürün Ailesi', material: 'Malzeme', materialValue: 'Polietilen (PE)',
    specs: 'Teknik Ölçüler', features: 'Standart Özellikler', issued: 'Tarih',
    tolerance: 'Ölçüler ±%5 toleranslıdır. Polietilen esnek bir malzeme olduğundan ölçülerde küçük farklılıklar olabilir.',
    note: 'Güncel bilgi ve fiyat teklifi için satış ekibimizle iletişime geçin.', contact: 'Teklif ve bilgi',
  },
  en: {
    title: 'Technical Datasheet', code: 'Product Code', family: 'Product Family', material: 'Material', materialValue: 'Polyethylene (PE)',
    specs: 'Technical Dimensions', features: 'Standard Features', issued: 'Date',
    tolerance: 'Dimensions have a ±5% tolerance. As polyethylene is a flexible material, dimensions may vary slightly.',
    note: 'Please contact our sales team for up-to-date information and pricing.', contact: 'Quotes & information',
  },
};

// DejaVu Sans does not shape Arabic script through pdfkit (no bidi/joining), so an
// Arabic offer gets the English sheet rather than unreadable Arabic glyphs.
const sheetLang = (lang) => (COLUMN_LABELS[lang] ? lang : 'en');

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
    filename: `${row.code} - Teknik Cizim.${ext}`,
    content: fs.readFileSync(diskPath),
    contentType: DRAWING_MIME[ext],
  };
}

/* One feature list per line, the family's and the model's own, deduplicated. */
function featureLines(family, row, lang) {
  const list = [
    ...(family.i18n?.[lang]?.features || family.i18n?.tr?.features || []),
    ...(row.i18n?.[lang]?.features || row.i18n?.tr?.features || []),
  ];
  const seen = new Set();
  return list.filter((item) => {
    const key = item.trim().toLocaleLowerCase('tr');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* A one-page technical datasheet PDF of a catalogue model, built from the same data as the public /datasheet page. */
export function datasheetAttachment(family, row, lang = 'tr') {
  const docLang = sheetLang(lang);
  const copy = SHEET_TEXT[docLang];
  const columns = COLUMN_LABELS[docLang];
  const title = family.i18n?.[docLang]?.title || family.i18n?.tr?.title || family.id;
  const text = row.i18n?.[docLang]?.text || row.i18n?.tr?.text || family.i18n?.[docLang]?.text || family.i18n?.tr?.text || '';
  const features = featureLines(family, row, docLang);

  const specs = [
    [copy.code, row.code],
    [copy.family, title],
    ...(family.columns || [])
      .filter((key) => key !== 'code' && row[key] !== undefined && row[key] !== '' && columns[key])
      .map((key) => [columns[key], String(row[key])]),
    [copy.material, copy.materialValue],
  ];

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('body', FONT_REGULAR);
    doc.registerFont('bold', FONT_BOLD);

    doc.font('bold').fontSize(18).fillColor('#101317').text('RMA Plastik', { continued: false });
    doc.font('bold').fontSize(11).fillColor('#e4173a').text(copy.title.toLocaleUpperCase(docLang));
    doc.font('body').fontSize(9).fillColor('#5c6673')
      .text(`${copy.issued}: ${new Intl.DateTimeFormat(docLang === 'tr' ? 'tr-TR' : 'en-GB', { dateStyle: 'long' }).format(new Date())}`);

    doc.moveDown(1);
    doc.font('bold').fontSize(20).fillColor('#101317').text(row.code, 50, doc.y);
    doc.font('body').fontSize(11).fillColor('#5c6673').text(title, 50, doc.y);

    if (text) {
      doc.moveDown(0.5);
      doc.font('body').fontSize(10).fillColor('#101317').text(text, 50, doc.y, { width: 495 });
    }

    doc.moveDown(1);
    doc.font('bold').fontSize(12).fillColor('#101317').text(copy.specs, 50, doc.y);
    doc.moveDown(0.3);

    const col1 = 230;
    specs.forEach(([label, value], index) => {
      const y = doc.y;
      if (index % 2 === 0) doc.rect(50, y - 2, 495, 20).fill('#f7f9fa');
      doc.fillColor('#5c6673').font('body').fontSize(10).text(label, 56, y, { width: col1 - 10 });
      doc.fillColor('#101317').font('bold').fontSize(10).text(value, 56 + col1, y, { width: 495 - col1 - 6 });
      doc.y = y + 20;
    });

    if (features.length) {
      doc.moveDown(1);
      doc.font('bold').fontSize(12).fillColor('#101317').text(copy.features, 50, doc.y);
      doc.moveDown(0.3);
      features.forEach((feature) => {
        doc.font('body').fontSize(10).fillColor('#101317').text(`•  ${feature}`, 50, doc.y, { width: 495 });
      });
    }

    doc.moveDown(1.2);
    doc.font('body').fontSize(8).fillColor('#818b98').text(copy.tolerance, 50, doc.y, { width: 495 });
    doc.text(copy.note, 50, doc.y, { width: 495 });

    doc.end();
  });
}

const MAX_MATCHED_PRODUCTS = 8;

/*
  Drawing + datasheet attachments for every catalogue model recognised among
  an offer's lines (deduplicated, capped so a long proforma cannot balloon
  the e-mail). A line with no match contributes nothing.
*/
export async function collectOfferAttachments(offer) {
  const families = await catalog();
  const lang = offer?.language || 'tr';
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

    try {
      const content = await datasheetAttachment(found.family, found.row, lang);
      attachments.push({ filename: `${found.row.code} - Teknik Föy.pdf`, content, contentType: 'application/pdf' });
    } catch (error) {
      console.error('Datasheet PDF error:', error);
    }
  }

  return attachments;
}
