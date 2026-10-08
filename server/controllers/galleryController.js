import mongoose from 'mongoose';

import GalleryPhoto from '../models/GalleryPhoto.js';
import { CONTENT_LANGUAGES } from '../config/languages.js';
import { markContentChanged } from '../models/SiteSettings.js';

const FIELDS = { caption: 200, location: 120 };
const IMAGE_PATTERN = /^\/uploads\/gallery\/[A-Za-z0-9._-]+$/;

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
  const image = str(body.image, 300);

  return {
    image: IMAGE_PATTERN.test(image) ? image : '',
    published: body.published === undefined ? true : Boolean(body.published),
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : 0,
    i18n: texts(body.i18n),
  };
}

/* Public snapshot part */
export async function publicGallery() {
  const photos = await GalleryPhoto.find({ published: true }).sort({ order: 1, createdAt: 1 });

  return photos.filter((photo) => photo.image).map((photo) => ({ image: photo.image, i18n: texts(photo.i18n) }));
}

export async function listGallery(req, res) {
  try {
    const photos = await GalleryPhoto.find().sort({ order: 1, createdAt: 1 });
    return res.json({ success: true, data: photos });
  } catch (error) {
    return handleError(res, error, 'List gallery error');
  }
}

export async function createGalleryPhoto(req, res) {
  try {
    const data = payload(req.body);
    if (!data.image) return fail(res, 400, 'Önce bir fotoğraf yükleyin.');

    const photo = await GalleryPhoto.create(data);
    await markContentChanged();
    return res.status(201).json({ success: true, data: photo });
  } catch (error) {
    return handleError(res, error, 'Create gallery photo error');
  }
}

export async function updateGalleryPhoto(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Fotoğraf bulunamadı.');
    const data = payload(req.body);
    if (!data.image) return fail(res, 400, 'Önce bir fotoğraf yükleyin.');

    const photo = await GalleryPhoto.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after', runValidators: true });
    if (!photo) return fail(res, 404, 'Fotoğraf bulunamadı.');

    await markContentChanged();
    return res.json({ success: true, data: photo });
  } catch (error) {
    return handleError(res, error, 'Update gallery photo error');
  }
}

export async function deleteGalleryPhoto(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Fotoğraf bulunamadı.');
    const photo = await GalleryPhoto.findByIdAndDelete(req.params.id);
    if (!photo) return fail(res, 404, 'Fotoğraf bulunamadı.');

    await markContentChanged();
    return res.json({ success: true });
  } catch (error) {
    return handleError(res, error, 'Delete gallery photo error');
  }
}
