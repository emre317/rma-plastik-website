import mongoose from 'mongoose';

import ExportMarket from '../models/ExportMarket.js';
import { CONTENT_LANGUAGES } from '../config/languages.js';
import { markContentChanged } from '../models/SiteSettings.js';

const FIELDS = { name: 80, region: 80 };
const POSITIONS = ['top', 'bottom', 'left', 'right'];

const str = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const validId = (id) => mongoose.isValidObjectId(id);

function handleError(res, error, label) {
  if (error instanceof mongoose.Error.ValidationError) {
    return fail(res, 400, Object.values(error.errors)[0]?.message || 'Lütfen alanları kontrol edin.');
  }

  if (error?.code === 11000) {
    return fail(res, 409, 'Bu ülke listede zaten var.');
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
    code: str(body.code, 2).toUpperCase(),
    labelPosition: POSITIONS.includes(body.labelPosition) ? body.labelPosition : 'top',
    published: body.published === undefined ? true : Boolean(body.published),
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : 0,
    i18n: texts(body.i18n),
  };
}

/* Public snapshot part */
export async function publicExportMarkets() {
  const markets = await ExportMarket.find({ published: true }).sort({ order: 1, createdAt: 1 });

  return markets.map((market) => ({ code: market.code, labelPosition: market.labelPosition, i18n: texts(market.i18n) }));
}

export async function listExportMarkets(req, res) {
  try {
    const markets = await ExportMarket.find().sort({ order: 1, createdAt: 1 });
    return res.json({ success: true, data: markets });
  } catch (error) {
    return handleError(res, error, 'List export markets error');
  }
}

export async function createExportMarket(req, res) {
  try {
    const data = payload(req.body);
    if (!/^[A-Z]{2}$/.test(data.code)) return fail(res, 400, 'Ülke seçin.');

    const market = await ExportMarket.create(data);
    await markContentChanged();
    return res.status(201).json({ success: true, data: market });
  } catch (error) {
    return handleError(res, error, 'Create export market error');
  }
}

export async function updateExportMarket(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Pazar bulunamadı.');
    const data = payload(req.body);
    if (!/^[A-Z]{2}$/.test(data.code)) return fail(res, 400, 'Ülke seçin.');

    const market = await ExportMarket.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after', runValidators: true });
    if (!market) return fail(res, 404, 'Pazar bulunamadı.');

    await markContentChanged();
    return res.json({ success: true, data: market });
  } catch (error) {
    return handleError(res, error, 'Update export market error');
  }
}

export async function deleteExportMarket(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Pazar bulunamadı.');
    const market = await ExportMarket.findByIdAndDelete(req.params.id);
    if (!market) return fail(res, 404, 'Pazar bulunamadı.');

    await markContentChanged();
    return res.json({ success: true });
  } catch (error) {
    return handleError(res, error, 'Delete export market error');
  }
}

/* Brochure markets into the database (only when there are none yet) */
export async function importDefaultExportMarkets(req, res) {
  try {
    if (await ExportMarket.countDocuments()) return fail(res, 409, 'Pazarlar zaten panelde.');

    const { default: builtIn } = await import('../../client/src/data/exportMarkets.builtin.js');
    const docs = await ExportMarket.insertMany(builtIn.map((market, index) => ({ ...payload(market), order: (index + 1) * 10 })));

    await markContentChanged();
    return res.status(201).json({ success: true, data: docs });
  } catch (error) {
    return handleError(res, error, 'Import export markets error');
  }
}
