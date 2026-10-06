import mongoose from 'mongoose';

import Product, {
  CONTENT_LANGUAGES,
  PRODUCT_CATEGORIES,
  PRODUCT_TEXT_FIELDS,
} from '../models/Product.js';
import SiteText from '../models/SiteText.js';
import SiteSettings, {
  getSiteSettings,
  markContentChanged,
} from '../models/SiteSettings.js';

const SETTINGS_FIELDS = [
  'phoneDisplay', 'phone', 'email', 'whatsapp',
  'addressStreet', 'addressDistrict', 'addressCountry',
  'linkedin', 'instagram', 'youtube', 'instagramHandle', 'youtubeHandle',
];

function str(value, max = 5000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
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
    return fail(res, 409, 'Bu adres (slug) başka bir üründe kullanılıyor.');
  }

  console.error(`${label}:`, error);
  return fail(res, 500, 'İşlem tamamlanamadı.');
}

/* ---------- Public snapshot used by the site build ---------- */

function toPublicProduct(doc) {
  return {
    slug: doc.slug,
    category: doc.category,
    quoteName: doc.quoteName,
    featured: doc.featured,
    order: doc.order,
    image: doc.image || '',
    i18n: Object.fromEntries(
      CONTENT_LANGUAGES.map((lang) => [
        lang,
        Object.fromEntries(
          Object.keys(PRODUCT_TEXT_FIELDS).map((field) => [field, doc.i18n?.[lang]?.[field] || ''])
        ),
      ])
    ),
    // Commerce fields (price, stock…) stay in the database until the shop is enabled,
    // so they never end up in the public site bundle.
  };
}

function toPublicSettings(settings) {
  const value = (field) => settings?.[field] || '';

  return {
    phoneDisplay: value('phoneDisplay'),
    phone: value('phone'),
    email: value('email'),
    whatsapp: value('whatsapp'),
    address: {
      street: value('addressStreet'),
      district: value('addressDistrict'),
      country: value('addressCountry'),
    },
    social: {
      linkedin: value('linkedin'),
      instagram: value('instagram'),
      youtube: value('youtube'),
    },
    handles: {
      instagram: value('instagramHandle'),
      youtube: value('youtubeHandle'),
    },
  };
}

export async function getPublicContent(req, res) {
  try {
    const [products, texts, settings] = await Promise.all([
      Product.find({ published: true }).sort({ order: 1, createdAt: 1 }),
      SiteText.find(),
      SiteSettings.findOne({ singleton: 'site' }),
    ]);

    const textMap = Object.fromEntries(CONTENT_LANGUAGES.map((lang) => [lang, {}]));

    texts.forEach((item) => {
      CONTENT_LANGUAGES.forEach((lang) => {
        if (item[lang]) {
          textMap[lang][item.key] = item[lang];
        }
      });
    });

    return res.json({
      version: 1,
      generatedAt: new Date().toISOString(),
      products: products.map(toPublicProduct),
      texts: textMap,
      settings: toPublicSettings(settings),
    });
  } catch (error) {
    return handleError(res, error, 'Public content error');
  }
}

/* ---------- Products (admin) ---------- */

function productPayload(body = {}) {
  const payload = {
    slug: str(body.slug, 120).toLowerCase(),
    category: PRODUCT_CATEGORIES.includes(body.category) ? body.category : undefined,
    quoteName: str(body.quoteName, 150),
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : 0,
    featured: Boolean(body.featured),
    published: body.published === undefined ? true : Boolean(body.published),
    image: str(body.image, 300),
    i18n: {},
    commerce: {
      sku: str(body.commerce?.sku, 80),
      price: body.commerce?.price === '' || body.commerce?.price == null ? null : Number(body.commerce.price),
      currency: ['TRY', 'USD', 'EUR'].includes(body.commerce?.currency) ? body.commerce.currency : 'TRY',
      stock: body.commerce?.stock === '' || body.commerce?.stock == null ? null : Number(body.commerce.stock),
      purchasable: Boolean(body.commerce?.purchasable),
    },
  };

  if (payload.image && !payload.image.startsWith('/uploads/')) {
    payload.image = '';
  }

  CONTENT_LANGUAGES.forEach((lang) => {
    payload.i18n[lang] = Object.fromEntries(
      Object.entries(PRODUCT_TEXT_FIELDS).map(([field, max]) => [field, str(body.i18n?.[lang]?.[field], max)])
    );
  });

  return payload;
}

export async function listProducts(req, res) {
  try {
    const products = await Product.find().sort({ order: 1, createdAt: 1 });
    return res.json({ success: true, data: products });
  } catch (error) {
    return handleError(res, error, 'List products error');
  }
}

export async function getProduct(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'Ürün bulunamadı.');
    const product = await Product.findById(req.params.id);
    if (!product) return fail(res, 404, 'Ürün bulunamadı.');
    return res.json({ success: true, data: product });
  } catch (error) {
    return handleError(res, error, 'Get product error');
  }
}

export async function createProduct(req, res) {
  try {
    const payload = productPayload(req.body);

    if (!payload.i18n.tr.name) return fail(res, 400, 'Türkçe ürün adı zorunludur.');

    const product = await Product.create(payload);
    await markContentChanged();
    return res.status(201).json({ success: true, data: product });
  } catch (error) {
    return handleError(res, error, 'Create product error');
  }
}

export async function updateProduct(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'Ürün bulunamadı.');

    const payload = productPayload(req.body);

    if (!payload.i18n.tr.name) return fail(res, 400, 'Türkçe ürün adı zorunludur.');

    const product = await Product.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!product) return fail(res, 404, 'Ürün bulunamadı.');

    await markContentChanged();
    return res.json({ success: true, data: product });
  } catch (error) {
    return handleError(res, error, 'Update product error');
  }
}

export async function deleteProduct(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'Ürün bulunamadı.');
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return fail(res, 404, 'Ürün bulunamadı.');
    await markContentChanged();
    return res.json({ success: true });
  } catch (error) {
    return handleError(res, error, 'Delete product error');
  }
}

/* ---------- Site texts (admin) ---------- */

export async function listTexts(req, res) {
  try {
    const texts = await SiteText.find().sort({ key: 1 });
    return res.json({ success: true, data: texts });
  } catch (error) {
    return handleError(res, error, 'List texts error');
  }
}

/* Body: { items: [{ key, tr, en, ar }] } – all-empty items remove the override */
export async function saveTexts(req, res) {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 500) : [];

    const operations = items
      .filter((item) => typeof item?.key === 'string' && /^[A-Za-z0-9_.-]{1,200}$/.test(item.key))
      .map((item) => {
        const values = Object.fromEntries(CONTENT_LANGUAGES.map((lang) => [lang, str(item[lang])]));
        const empty = CONTENT_LANGUAGES.every((lang) => !values[lang]);

        return empty
          ? { deleteOne: { filter: { key: item.key } } }
          : { updateOne: { filter: { key: item.key }, update: { $set: values }, upsert: true } };
      });

    if (operations.length) {
      await SiteText.bulkWrite(operations);
      await markContentChanged();
    }

    return res.json({ success: true, saved: operations.length });
  } catch (error) {
    return handleError(res, error, 'Save texts error');
  }
}

/* ---------- Settings (admin) ---------- */

export async function getSettings(req, res) {
  try {
    return res.json({ success: true, data: await getSiteSettings() });
  } catch (error) {
    return handleError(res, error, 'Get settings error');
  }
}

export async function updateSettings(req, res) {
  try {
    const update = Object.fromEntries(
      SETTINGS_FIELDS.map((field) => [field, str(req.body?.[field], 300)])
    );

    update.whatsapp = update.whatsapp.replace(/\D/g, '');
    update.phone = update.phone.replace(/[^\d+]/g, '');

    for (const field of ['linkedin', 'instagram', 'youtube']) {
      if (update[field] && !/^https:\/\//.test(update[field])) {
        return fail(res, 400, `${field} adresi https:// ile başlamalıdır.`);
      }
    }

    const settings = await SiteSettings.findOneAndUpdate(
      { singleton: 'site' },
      { $set: { ...update, contentChangedAt: new Date() } },
      { new: true, upsert: true, runValidators: true }
    );

    return res.json({ success: true, data: settings });
  } catch (error) {
    return handleError(res, error, 'Update settings error');
  }
}
