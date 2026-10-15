import mongoose from 'mongoose';

import ProductGroup, { GROUP_CATEGORIES, GROUP_PAGES } from '../models/ProductGroup.js';
import Sector, { SECTOR_ICONS, SECTOR_STORED } from '../models/Sector.js';
import ProductFamily from '../models/ProductFamily.js';
import { CONTENT_LANGUAGES } from '../config/languages.js';
import { markContentChanged } from '../models/SiteSettings.js';

/*
  Product groups (Ürün Grupları) and sectors (Sektörler) in the admin panel
  and in the public snapshot.
*/

const IMAGE_PATTERN = /^\/(uploads|images)\/[\w./-]{1,280}$/;
const GROUP_ID = /^[A-Za-z0-9-]{2,60}$/;
const GROUP_TEXT = { label: 60, title: 120, description: 600, application: 80 };
const SECTOR_TEXT = { title: 80, description: 400 };
const MAX_PRODUCTS = 40;

const str = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const validId = (id) => mongoose.isValidObjectId(id);
const num = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

const cleanImage = (value) => {
  const image = str(value, 300);
  return IMAGE_PATTERN.test(image) && !image.includes('..') ? image : '';
};

const texts = (source, fields) =>
  Object.fromEntries(
    CONTENT_LANGUAGES.map((lang) => [
      lang,
      Object.fromEntries(Object.entries(fields).map(([field, max]) => [field, str(source?.[lang]?.[field], max)])),
    ])
  );

function handleError(res, error, label) {
  if (error instanceof mongoose.Error.ValidationError) {
    return fail(res, 400, Object.values(error.errors)[0]?.message || 'Lütfen alanları kontrol edin.');
  }

  if (error?.code === 11000) {
    return fail(res, 409, 'Bu kimlik başka bir kayıtta kullanılıyor.');
  }

  console.error(`${label}:`, error);
  return fail(res, 500, 'İşlem tamamlanamadı.');
}

/* ---------- Payloads ---------- */

function groupPayload(body = {}) {
  return {
    groupId: str(body.groupId, 60),
    order: num(body.order, 0),
    published: body.published === undefined ? true : Boolean(body.published),
    image: cleanImage(body.image),
    hue: Math.min(360, Math.max(0, num(body.hue, 210))),
    quoteOnly: Boolean(body.quoteOnly),
    monoblock: body.monoblock === undefined ? true : Boolean(body.monoblock),
    page: GROUP_PAGES.includes(body.page) ? body.page : 'tables',
    // Left empty when not chosen, so the built-in group's category applies
    category: GROUP_CATEGORIES.includes(body.category) ? body.category : undefined,
    i18n: texts(body.i18n, GROUP_TEXT),
  };
}

function sectorPayload(body = {}) {
  const products = (Array.isArray(body.products) ? body.products : [])
    .slice(0, MAX_PRODUCTS)
    .map((product) => ({
      group: GROUP_ID.test(str(product?.group, 60)) ? str(product.group, 60) : '',
      families: (Array.isArray(product?.families) ? product.families : [])
        .map((id) => str(id, 80))
        .filter((id) => /^[a-z0-9-]{2,80}$/.test(id))
        .slice(0, 20),
      i18n: texts(product?.i18n, { name: 120 }),
    }))
    .filter((product) => product.i18n.tr.name);

  return {
    sectorId: str(body.sectorId, 60).toLowerCase(),
    order: num(body.order, 0),
    published: body.published === undefined ? true : Boolean(body.published),
    icon: SECTOR_ICONS.includes(body.icon) ? body.icon : 'layers',
    hue: Math.min(360, Math.max(0, num(body.hue, 210))),
    stored: SECTOR_STORED.includes(body.stored) ? body.stored : '',
    i18n: texts(body.i18n, SECTOR_TEXT),
    products,
  };
}

/* ---------- Public snapshot ---------- */

export async function publicProductGroups() {
  const [groups, { groups: builtInGroups }] = await Promise.all([
    ProductGroup.find({ published: true }).sort({ order: 1, createdAt: 1 }),
    builtIn(),
  ]);
  // Groups saved before categories existed take the built-in group's category
  const builtInCategory = (id) => builtInGroups.find((item) => item.id === id)?.category;

  return groups.map((group) => ({
    id: group.groupId,
    image: group.image || '',
    hue: group.hue,
    quoteOnly: group.quoteOnly,
    monoblock: group.monoblock,
    page: group.page,
    category: group.category || builtInCategory(group.groupId) || 'other',
    i18n: texts(group.i18n, GROUP_TEXT),
  }));
}

export async function publicSectors() {
  const sectors = await Sector.find({ published: true }).sort({ order: 1, createdAt: 1 });

  return sectors.map((sector) => ({
    id: sector.sectorId,
    icon: sector.icon,
    hue: sector.hue,
    stored: sector.stored,
    i18n: texts(sector.i18n, SECTOR_TEXT),
    products: sector.products.map((product) => ({
      group: product.group,
      families: product.families,
      i18n: texts(product.i18n, { name: 120 }),
    })),
  }));
}

/* ---------- Built-in data (import button) ---------- */

async function builtIn() {
  const [{ default: groups }, { default: sectors }, { default: tr }, { default: en }, { default: ar }] = await Promise.all([
    import('../../client/src/data/productGroups.builtin.js'),
    import('../../client/src/data/sectors.builtin.js'),
    import('../../client/src/i18n/locales/tr.js'),
    import('../../client/src/i18n/locales/en.js'),
    import('../../client/src/i18n/locales/ar.js'),
  ]);

  return { groups, sectors, locales: { tr, en, ar } };
}

export async function builtInGroupDocs() {
  const { groups, locales } = await builtIn();

  return groups.map((group, index) => groupPayload({
    ...group,
    groupId: group.id,
    order: (index + 1) * 10,
    i18n: Object.fromEntries(CONTENT_LANGUAGES.map((lang) => [lang, locales[lang].productExplorer?.items?.[group.id] || {}])),
  }));
}

export async function builtInSectorDocs() {
  const { sectors, locales } = await builtIn();

  return sectors.map((sector, index) => {
    const item = (lang) => locales[lang].industries?.items?.[index] || {};

    return sectorPayload({
      ...sector,
      sectorId: sector.id,
      order: (index + 1) * 10,
      i18n: Object.fromEntries(CONTENT_LANGUAGES.map((lang) => [lang, { title: item(lang).title, description: item(lang).description }])),
      products: sector.products.map((product, i) => ({
        ...product,
        i18n: Object.fromEntries(CONTENT_LANGUAGES.map((lang) => [lang, { name: item(lang).products?.[i] || '' }])),
      })),
    });
  });
}

/* ---------- Admin: product groups ---------- */

export async function listGroups(req, res) {
  try {
    const groups = await ProductGroup.find().sort({ order: 1, createdAt: 1 });
    return res.json({ success: true, data: groups });
  } catch (error) {
    return handleError(res, error, 'List product groups error');
  }
}

export async function createGroup(req, res) {
  try {
    const data = groupPayload(req.body);
    if (!data.i18n.tr.label) return fail(res, 400, 'Türkçe grup adı zorunludur.');

    const group = await ProductGroup.create(data);
    await markContentChanged();
    return res.status(201).json({ success: true, data: group });
  } catch (error) {
    return handleError(res, error, 'Create product group error');
  }
}

export async function updateGroup(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Ürün grubu bulunamadı.');
    const data = groupPayload(req.body);
    if (!data.i18n.tr.label) return fail(res, 400, 'Türkçe grup adı zorunludur.');

    const current = await ProductGroup.findById(req.params.id);
    if (!current) return fail(res, 404, 'Ürün grubu bulunamadı.');

    // The id is referenced by tables and sectors: it stays as created
    data.groupId = current.groupId;
    Object.assign(current, data);
    await current.save();

    await markContentChanged();
    return res.json({ success: true, data: current });
  } catch (error) {
    return handleError(res, error, 'Update product group error');
  }
}

export async function deleteGroup(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Ürün grubu bulunamadı.');
    const group = await ProductGroup.findById(req.params.id);
    if (!group) return fail(res, 404, 'Ürün grubu bulunamadı.');

    // Never leave tables or sector products pointing at a missing group
    // (while none are saved in the panel, the site shows the built-in ones)
    const [savedTables, savedSectors] = await Promise.all([ProductFamily.countDocuments(), Sector.countDocuments()]);
    const { default: builtInTables } = await import('../../client/src/data/productTables.builtin.js');
    const { sectors: builtInSectors } = await builtIn();

    const [tables, sectors] = await Promise.all([
      savedTables
        ? ProductFamily.countDocuments({ group: group.groupId })
        : builtInTables.filter((family) => family.group === group.groupId).length,
      savedSectors
        ? Sector.countDocuments({ 'products.group': group.groupId })
        : builtInSectors.filter((sector) => sector.products.some((product) => product.group === group.groupId)).length,
    ]);

    if (tables || sectors) {
      const parts = [tables && `${tables} ürün tablosu`, sectors && `${sectors} sektör`].filter(Boolean).join(' ve ');
      return fail(res, 409, `Bu gruba bağlı ${parts} var. Önce onları başka bir gruba taşıyın ya da gizleyin.`);
    }

    await group.deleteOne();
    await markContentChanged();
    return res.json({ success: true });
  } catch (error) {
    return handleError(res, error, 'Delete product group error');
  }
}

export async function importDefaultGroups(req, res) {
  try {
    if (await ProductGroup.countDocuments()) return fail(res, 409, 'Ürün grupları zaten panelde.');

    const docs = await ProductGroup.insertMany(await builtInGroupDocs());
    await markContentChanged();
    return res.status(201).json({ success: true, imported: docs.length });
  } catch (error) {
    return handleError(res, error, 'Import product groups error');
  }
}

/* ---------- Admin: sectors ---------- */

export async function listSectors(req, res) {
  try {
    const sectors = await Sector.find().sort({ order: 1, createdAt: 1 });
    return res.json({ success: true, data: sectors });
  } catch (error) {
    return handleError(res, error, 'List sectors error');
  }
}

export async function getSector(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Sektör bulunamadı.');
    const sector = await Sector.findById(req.params.id);
    if (!sector) return fail(res, 404, 'Sektör bulunamadı.');
    return res.json({ success: true, data: sector });
  } catch (error) {
    return handleError(res, error, 'Get sector error');
  }
}

export async function createSector(req, res) {
  try {
    const data = sectorPayload(req.body);
    if (!data.i18n.tr.title) return fail(res, 400, 'Türkçe sektör adı zorunludur.');

    const sector = await Sector.create(data);
    await markContentChanged();
    return res.status(201).json({ success: true, data: sector });
  } catch (error) {
    return handleError(res, error, 'Create sector error');
  }
}

export async function updateSector(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Sektör bulunamadı.');
    const data = sectorPayload(req.body);
    if (!data.i18n.tr.title) return fail(res, 400, 'Türkçe sektör adı zorunludur.');

    const sector = await Sector.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after', runValidators: true });
    if (!sector) return fail(res, 404, 'Sektör bulunamadı.');

    await markContentChanged();
    return res.json({ success: true, data: sector });
  } catch (error) {
    return handleError(res, error, 'Update sector error');
  }
}

export async function deleteSector(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Sektör bulunamadı.');
    const sector = await Sector.findByIdAndDelete(req.params.id);
    if (!sector) return fail(res, 404, 'Sektör bulunamadı.');

    await markContentChanged();
    return res.json({ success: true });
  } catch (error) {
    return handleError(res, error, 'Delete sector error');
  }
}

export async function importDefaultSectors(req, res) {
  try {
    if (await Sector.countDocuments()) return fail(res, 409, 'Sektörler zaten panelde.');

    const docs = await Sector.insertMany(await builtInSectorDocs());
    await markContentChanged();
    return res.status(201).json({ success: true, imported: docs.length });
  } catch (error) {
    return handleError(res, error, 'Import sectors error');
  }
}
