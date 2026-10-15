import mongoose from 'mongoose';

import { CONTENT_LANGUAGES } from '../config/languages.js';
import SiteText from '../models/SiteText.js';
import { publicPosts, publicVideos } from './mediaController.js';
import { publicFamilies } from './productFamilyController.js';
import { publicProductGroups, publicSectors } from './catalogueController.js';
import { publicProjects } from './projectController.js';
import { publicFaqs } from './faqController.js';
import { publicGallery } from './galleryController.js';
import { publicExportMarkets } from './exportMarketController.js';
import SiteSettings, {
  getSiteSettings,
  markContentChanged,
} from '../models/SiteSettings.js';

const SETTINGS_FIELDS = [
  'phoneDisplay', 'phone', 'email', 'whatsapp',
  'addressStreet', 'addressDistrict', 'addressCountry',
  'linkedin', 'instagram', 'youtube', 'instagramHandle', 'youtubeHandle',
  'companyLegalName', 'taxInfo', 'offerBankInfo', 'offerTerms',
];

// Longer texts; every other field is at most 300 characters
const SETTINGS_LIMITS = { companyLegalName: 200, taxInfo: 160, offerBankInfo: 800, offerTerms: 3000 };

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
    return fail(res, 409, 'Bu adres (slug) başka bir kayıtta kullanılıyor.');
  }

  console.error(`${label}:`, error);
  return fail(res, 500, 'İşlem tamamlanamadı.');
}

/* ---------- Public snapshot used by the site build ---------- */

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
    const [texts, settings, posts, videos, productFamilies, projects, exportMarkets, faqs, gallery, productGroups, sectors] = await Promise.all([
      SiteText.find(),
      SiteSettings.findOne({ singleton: 'site' }),
      publicPosts(),
      publicVideos(),
      publicFamilies(),
      publicProjects(),
      publicExportMarkets(),
      publicFaqs(),
      publicGallery(),
      publicProductGroups(),
      publicSectors(),
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
      texts: textMap,
      settings: toPublicSettings(settings),
      posts,
      videos,
      productFamilies,
      productGroups,
      sectors,
      projects,
      exportMarkets,
      faqs,
      gallery,
    });
  } catch (error) {
    return handleError(res, error, 'Public content error');
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
      SETTINGS_FIELDS.map((field) => [field, str(req.body?.[field], SETTINGS_LIMITS[field] || 300)])
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
      { returnDocument: 'after', upsert: true, runValidators: true }
    );

    return res.json({ success: true, data: settings });
  } catch (error) {
    return handleError(res, error, 'Update settings error');
  }
}
