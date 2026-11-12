import mongoose from 'mongoose';

import ProductFamily, {
  COLUMN_KEYS,
  MAX_FAMILY_IMAGES,
  MAX_FEATURES,
  MAX_FEATURE_LENGTH,
  MAX_ROW_IMAGES,
  WATER_USES,
} from '../models/ProductFamily.js';
import { CONTENT_LANGUAGES } from '../config/languages.js';
import { markContentChanged } from '../models/SiteSettings.js';

/*
  Product tables (Ürün tabloları) in the admin panel and in the public snapshot.
*/

const MAX_ROWS = 300;
const IMAGE_PATTERN = /^\/(uploads|images)\/[\w./-]{1,280}$/;

const str = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

const cleanImage = (value) => {
  const image = str(value, 300);
  return IMAGE_PATTERN.test(image) && !image.includes('..') ? image : '';
};

// Extra photos: valid site paths only, no duplicates, never the cover again
const cleanImages = (value, max, cover = '') =>
  [...new Set((Array.isArray(value) ? value : []).map(cleanImage).filter((image) => image && image !== cover))].slice(0, max);

// "Standart özellikler": one feature per line (a list is accepted too), no empty or repeated lines
export const featureLines = (value) => [
  ...new Set(
    (Array.isArray(value) ? value : String(value ?? '').split(/\r?\n/))
      .map((line) => (typeof line === 'string' ? line.replace(/^\s*[-•*✓]\s+/, '').trim().slice(0, MAX_FEATURE_LENGTH) : ''))
      .filter(Boolean)
  ),
].slice(0, MAX_FEATURES);

// Numbers stay numbers (sorting/filters); "40-60", "35 x 35", '3/4"' stay text
function cleanValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const text = str(String(value ?? ''), 40);
  if (!text) return undefined;

  return /^\d+(\.\d+)?$/.test(text) ? Number(text) : text;
}

function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function handleError(res, error, label) {
  if (error instanceof mongoose.Error.ValidationError) {
    const first = Object.values(error.errors)[0];
    return fail(res, 400, first?.message || 'Lütfen alanları kontrol edin.');
  }

  if (error?.code === 11000) {
    return fail(res, 409, 'Bu kimlik başka bir ürün ailesinde kullanılıyor.');
  }

  console.error(`${label}:`, error);
  return fail(res, 500, 'İşlem tamamlanamadı.');
}

function familyPayload(body = {}) {
  const columns = Array.isArray(body.columns)
    ? [...new Set(body.columns.filter((key) => COLUMN_KEYS.includes(key)))]
    : [];

  const rows = (Array.isArray(body.rows) ? body.rows : [])
    .slice(0, MAX_ROWS)
    .map((row) => ({
      code: str(row?.code, 60),
      image: cleanImage(row?.image),
      images: cleanImages(row?.images, MAX_ROW_IMAGES, cleanImage(row?.image)),
      values: Object.fromEntries(
        columns
          .map((key) => [key, cleanValue(row?.values?.[key])])
          .filter(([, value]) => value !== undefined)
      ),
      i18n: Object.fromEntries(
        CONTENT_LANGUAGES.map((lang) => [
          lang,
          { text: str(row?.i18n?.[lang]?.text, 800), features: featureLines(row?.i18n?.[lang]?.features).join('\n') },
        ])
      ),
    }))
    .filter((row) => row.code);

  const water = body.waterTank || {};

  return {
    familyId: str(body.familyId, 80).toLowerCase(),
    group: /^[A-Za-z0-9-]{2,60}$/.test(str(body.group, 60)) ? str(body.group, 60) : '',
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : 0,
    published: body.published === undefined ? true : Boolean(body.published),
    image: cleanImage(body.image),
    images: cleanImages(body.images, MAX_FAMILY_IMAGES, cleanImage(body.image)),
    columns,
    i18n: Object.fromEntries(
      CONTENT_LANGUAGES.map((lang) => [
        lang,
        {
          title: str(body.i18n?.[lang]?.title, 120),
          text: str(body.i18n?.[lang]?.text, 800),
          featuresTitle: str(body.i18n?.[lang]?.featuresTitle, 80),
          features: featureLines(body.i18n?.[lang]?.features).join('\n'),
        },
      ])
    ),
    rows,
    waterTank: {
      enabled: Boolean(water.enabled),
      orientation: water.orientation === 'horizontal' ? 'horizontal' : 'vertical',
      layer: water.layer === 'double' ? 'double' : 'single',
      uses: Array.isArray(water.uses) ? water.uses.filter((use) => WATER_USES.includes(use)) : [],
    },
  };
}

/* ---------- Public snapshot ---------- */

// A model's own description and features, only the languages and fields that are filled
function rowTexts(row) {
  const i18n = {};

  CONTENT_LANGUAGES.forEach((lang) => {
    const text = row.i18n?.[lang]?.text || '';
    const features = featureLines(row.i18n?.[lang]?.features);
    if (text || features.length) i18n[lang] = { ...(text ? { text } : {}), ...(features.length ? { features } : {}) };
  });

  return Object.keys(i18n).length ? { i18n } : {};
}

export function toPublicFamily(doc) {
  return {
    id: doc.familyId,
    group: doc.group,
    image: doc.image || null,
    ...(doc.images?.length ? { images: [...doc.images] } : {}),
    columns: ['code', ...doc.columns],
    i18n: Object.fromEntries(
      CONTENT_LANGUAGES.map((lang) => {
        const features = featureLines(doc.i18n?.[lang]?.features);
        return [
          lang,
          {
            title: doc.i18n?.[lang]?.title || '',
            text: doc.i18n?.[lang]?.text || '',
            ...(doc.i18n?.[lang]?.featuresTitle ? { featuresTitle: doc.i18n[lang].featuresTitle } : {}),
            ...(features.length ? { features } : {}),
          },
        ];
      })
    ),
    rows: doc.rows.map((row) => ({
      code: row.code,
      ...row.values,
      ...(row.image ? { image: row.image } : {}),
      ...(row.images?.length ? { images: [...row.images] } : {}),
      ...rowTexts(row),
    })),
    waterTank: doc.waterTank?.enabled
      ? { orientation: doc.waterTank.orientation, layer: doc.waterTank.layer, uses: doc.waterTank.uses }
      : null,
  };
}

export const publicFamilies = async () =>
  (await ProductFamily.find({ published: true }).sort({ order: 1, createdAt: 1 })).map(toPublicFamily);

/* ---------- Admin ---------- */

export async function listFamilies(req, res) {
  try {
    const families = await ProductFamily.find().sort({ order: 1, createdAt: 1 });
    return res.json({ success: true, data: families });
  } catch (error) {
    return handleError(res, error, 'List product families error');
  }
}

export async function getFamily(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'Ürün ailesi bulunamadı.');
    const family = await ProductFamily.findById(req.params.id);
    if (!family) return fail(res, 404, 'Ürün ailesi bulunamadı.');
    return res.json({ success: true, data: family });
  } catch (error) {
    return handleError(res, error, 'Get product family error');
  }
}

export async function createFamily(req, res) {
  try {
    const payload = familyPayload(req.body);
    if (!payload.i18n.tr.title) return fail(res, 400, 'Türkçe başlık zorunludur.');

    const family = await ProductFamily.create(payload);
    await markContentChanged();
    return res.status(201).json({ success: true, data: family });
  } catch (error) {
    return handleError(res, error, 'Create product family error');
  }
}

export async function updateFamily(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'Ürün ailesi bulunamadı.');

    const payload = familyPayload(req.body);
    if (!payload.i18n.tr.title) return fail(res, 400, 'Türkçe başlık zorunludur.');

    const family = await ProductFamily.findByIdAndUpdate(req.params.id, payload, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!family) return fail(res, 404, 'Ürün ailesi bulunamadı.');

    await markContentChanged();
    return res.json({ success: true, data: family });
  } catch (error) {
    return handleError(res, error, 'Update product family error');
  }
}

export async function deleteFamily(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'Ürün ailesi bulunamadı.');
    const family = await ProductFamily.findByIdAndDelete(req.params.id);
    if (!family) return fail(res, 404, 'Ürün ailesi bulunamadı.');
    await markContentChanged();
    return res.json({ success: true });
  } catch (error) {
    return handleError(res, error, 'Delete product family error');
  }
}

/*
  Built-in brochure tables as database records (import button and seed script).
  Loaded from the site project only when needed, so the API starts without it.
*/
export async function builtInFamilyDocs() {
  const [{ default: builtInFamilies }, { default: tr }, { default: en }, { default: ar }] = await Promise.all([
    import('../../client/src/data/productTables.builtin.js'),
    import('../../client/src/i18n/locales/tr.js'),
    import('../../client/src/i18n/locales/en.js'),
    import('../../client/src/i18n/locales/ar.js'),
  ]);
  const locales = { tr, en, ar };

  return builtInFamilies.map((family, index) => ({
    familyId: family.id,
    group: family.group,
    order: (index + 1) * 10,
    published: true,
    image: family.image || '',
    columns: family.columns.filter((key) => key !== 'code'),
    i18n: Object.fromEntries(
      CONTENT_LANGUAGES.map((lang) => [
        lang,
        {
          title: locales[lang].productTables?.families?.[family.id]?.title || '',
          text: locales[lang].productTables?.families?.[family.id]?.text || '',
          // Brochure feature list of the family; water tanks share the list of the water tank page
          features: featureLines(
            locales[lang].productTables?.families?.[family.id]?.features ||
              (family.waterTank ? locales[lang].waterTanks?.features : [])
          ).join('\n'),
        },
      ])
    ),
    rows: family.rows.map(({ code, image, ...values }) => ({ code, image: image || '', values })),
    waterTank: family.waterTank ? { enabled: true, ...family.waterTank } : { enabled: false },
  }));
}

/* Imports the brochure tables when the database has none yet */
export async function importDefaultFamilies(req, res) {
  try {
    const count = await ProductFamily.countDocuments();
    if (count > 0) return fail(res, 409, 'Veritabanında zaten ürün tablosu var.');

    const docs = await ProductFamily.insertMany(await builtInFamilyDocs());
    await markContentChanged();
    return res.status(201).json({ success: true, imported: docs.length });
  } catch (error) {
    return handleError(res, error, 'Import product families error');
  }
}
