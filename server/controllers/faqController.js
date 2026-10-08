import mongoose from 'mongoose';

import Faq, { FAQ_TOPICS } from '../models/Faq.js';
import { CONTENT_LANGUAGES } from '../config/languages.js';
import { markContentChanged } from '../models/SiteSettings.js';

const FIELDS = { question: 300, answer: 3000 };

const str = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const validId = (id) => mongoose.isValidObjectId(id);

function handleError(res, error, label) {
  if (error instanceof mongoose.Error.ValidationError) {
    return fail(res, 400, Object.values(error.errors)[0]?.message || 'Lütfen alanları kontrol edin.');
  }

  console.error(`${label}:`, error);
  return fail(res, 500, 'İşlem tamamlanamadı.');
}

const texts = (source) =>
  Object.fromEntries(
    CONTENT_LANGUAGES.map((lang) => [
      lang,
      Object.fromEntries(Object.entries(FIELDS).map(([field, max]) => [field, str(source?.[lang]?.[field], max)])),
    ])
  );

function payload(body = {}) {
  return {
    topic: FAQ_TOPICS.includes(body.topic) ? body.topic : 'general',
    published: body.published === undefined ? true : Boolean(body.published),
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : 0,
    i18n: texts(body.i18n),
  };
}

// A question needs its Turkish text; it can only go live with an answer
function invalid(data) {
  if (!data.i18n.tr.question) return 'Türkçe soru zorunludur.';
  if (data.published && !data.i18n.tr.answer) return 'Sitede göstermek için Türkçe cevabı yazın (ya da “Sitede göster”i kapatın).';
  return '';
}

/* Public snapshot part: only answered questions */
export async function publicFaqs() {
  const faqs = await Faq.find({ published: true }).sort({ order: 1, createdAt: 1 });

  return faqs
    .map((faq) => ({ topic: faq.topic, i18n: texts(faq.i18n) }))
    .filter((faq) => faq.i18n.tr.question && faq.i18n.tr.answer);
}

export async function listFaqs(req, res) {
  try {
    const faqs = await Faq.find().sort({ order: 1, createdAt: 1 });
    return res.json({ success: true, data: faqs });
  } catch (error) {
    return handleError(res, error, 'List FAQ error');
  }
}

export async function createFaq(req, res) {
  try {
    const data = payload(req.body);
    const problem = invalid(data);
    if (problem) return fail(res, 400, problem);

    const faq = await Faq.create(data);
    await markContentChanged();
    return res.status(201).json({ success: true, data: faq });
  } catch (error) {
    return handleError(res, error, 'Create FAQ error');
  }
}

export async function updateFaq(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Soru bulunamadı.');
    const data = payload(req.body);
    const problem = invalid(data);
    if (problem) return fail(res, 400, problem);

    const faq = await Faq.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after', runValidators: true });
    if (!faq) return fail(res, 404, 'Soru bulunamadı.');

    await markContentChanged();
    return res.json({ success: true, data: faq });
  } catch (error) {
    return handleError(res, error, 'Update FAQ error');
  }
}

export async function deleteFaq(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Soru bulunamadı.');
    const faq = await Faq.findByIdAndDelete(req.params.id);
    if (!faq) return fail(res, 404, 'Soru bulunamadı.');

    await markContentChanged();
    return res.json({ success: true });
  } catch (error) {
    return handleError(res, error, 'Delete FAQ error');
  }
}
