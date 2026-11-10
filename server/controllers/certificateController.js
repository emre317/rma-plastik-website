import mongoose from 'mongoose';

import Certificate from '../models/Certificate.js';
import { CONTENT_LANGUAGES } from '../config/languages.js';
import { markContentChanged } from '../models/SiteSettings.js';
import { CERTIFICATE_CATEGORIES } from '../../client/src/data/certificates.builtin.js';

const FIELDS = { title: 160, scope: 1200 };
const FILE_PATTERN = /^\/(uploads\/certificates|documents\/certificates)\/[A-Za-z0-9._-]+\.pdf$/;
const IMAGE_PATTERN = /^\/(uploads\/certificates|images\/certificates)\/[A-Za-z0-9._-]+\.(webp|jpe?g|png)$/;

const str = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const validId = (id) => mongoose.isValidObjectId(id);

// "2027-08-26" (or a full date) -> Date at noon Türkiye time, else null
function day(value) {
  const text = typeof value === 'string' ? value.slice(0, 10) : value instanceof Date ? value.toISOString().slice(0, 10) : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T12:00:00+03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const httpsUrl = (value) => {
  const url = str(value, 300);
  return /^https:\/\/[^\s<>"]+$/i.test(url) ? url : '';
};

function handleError(res, error, label) {
  if (error instanceof mongoose.Error.ValidationError) {
    return fail(res, 400, Object.values(error.errors)[0]?.message || 'Lütfen alanları kontrol edin.');
  }
  console.error(`${label}:`, error);
  return fail(res, 500, 'İşlem tamamlanamadı.');
}

const texts = (source) =>
  Object.fromEntries(
    CONTENT_LANGUAGES.map((lang) => [lang, Object.fromEntries(Object.entries(FIELDS).map(([field, max]) => [field, str(source?.[lang]?.[field], max)]))])
  );

export function certificatePayload(body = {}) {
  const file = str(body.file, 300);
  const image = str(body.image, 300);
  return {
    code: str(body.code, 60),
    category: CERTIFICATE_CATEGORIES.includes(body.category) ? body.category : 'quality',
    number: str(body.number, 60),
    holder: str(body.holder, 160),
    issuer: str(body.issuer, 120),
    accreditation: str(body.accreditation, 120),
    issuedAt: day(body.issuedAt),
    validUntil: day(body.validUntil),
    file: FILE_PATTERN.test(file) ? file : '',
    image: IMAGE_PATTERN.test(image) ? image : '',
    verifyUrl: httpsUrl(body.verifyUrl),
    published: body.published === undefined ? true : Boolean(body.published),
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : 0,
    i18n: texts(body.i18n),
  };
}

const dateText = (date) => (date ? new Date(date).toISOString().slice(0, 10) : '');

/*
  Public snapshot part: published and not expired at publishing time.
  null while the panel has no certificates at all (the site keeps the built-in list).
*/
export async function publicCertificates(now = new Date()) {
  if (!(await Certificate.countDocuments())) return null;
  const list = await Certificate.find({ published: true }).sort({ order: 1, createdAt: 1 });
  return list
    .filter((item) => !item.validUntil || new Date(item.validUntil).getTime() + 86400000 > now.getTime())
    .map((item) => ({
      code: item.code,
      category: item.category,
      number: item.number,
      holder: item.holder,
      issuer: item.issuer,
      accreditation: item.accreditation,
      issuedAt: dateText(item.issuedAt),
      validUntil: dateText(item.validUntil),
      file: item.file,
      image: item.image,
      verifyUrl: item.verifyUrl,
      i18n: texts(item.i18n),
    }));
}

export async function listCertificates(req, res) {
  try {
    const data = await Certificate.find().sort({ order: 1, createdAt: 1 });
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error, 'List certificates error');
  }
}

function check(data) {
  if (!data.code) return 'Belge adı / standart (ör. ISO 9001:2015) zorunludur.';
  if (!data.i18n.tr.title) return 'Türkçe başlık zorunludur.';
  if (data.issuedAt && data.validUntil && data.validUntil < data.issuedAt) return 'Geçerlilik tarihi, yayın tarihinden önce olamaz.';
  return '';
}

export async function createCertificate(req, res) {
  try {
    const data = certificatePayload(req.body);
    const problem = check(data);
    if (problem) return fail(res, 400, problem);
    const certificate = await Certificate.create(data);
    await markContentChanged();
    return res.status(201).json({ success: true, data: certificate });
  } catch (error) {
    return handleError(res, error, 'Create certificate error');
  }
}

export async function updateCertificate(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Belge bulunamadı.');
    const data = certificatePayload(req.body);
    const problem = check(data);
    if (problem) return fail(res, 400, problem);
    const certificate = await Certificate.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after', runValidators: true });
    if (!certificate) return fail(res, 404, 'Belge bulunamadı.');
    await markContentChanged();
    return res.json({ success: true, data: certificate });
  } catch (error) {
    return handleError(res, error, 'Update certificate error');
  }
}

export async function deleteCertificate(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Belge bulunamadı.');
    const certificate = await Certificate.findByIdAndDelete(req.params.id);
    if (!certificate) return fail(res, 404, 'Belge bulunamadı.');
    await markContentChanged();
    return res.json({ success: true });
  } catch (error) {
    return handleError(res, error, 'Delete certificate error');
  }
}

/* Built-in certificates into the database (only when there are none yet) */
export async function importDefaultCertificates(req, res) {
  try {
    if (await Certificate.countDocuments()) return fail(res, 409, 'Sertifikalar zaten panelde.');
    const { default: builtIn } = await import('../../client/src/data/certificates.builtin.js');
    const docs = await Certificate.insertMany(builtIn.map((item, index) => ({ ...certificatePayload(item), order: (index + 1) * 10 })));
    await markContentChanged();
    return res.status(201).json({ success: true, data: docs });
  } catch (error) {
    return handleError(res, error, 'Import certificates error');
  }
}
