import mongoose from 'mongoose';

import Post from '../models/Post.js';
import Video from '../models/Video.js';
import { markContentChanged } from '../models/SiteSettings.js';

const LANGS = ['tr', 'en', 'ar'];
const POST_FIELDS = { title: 160, excerpt: 400, body: 60000, seoTitle: 70, seoDescription: 170 };
const VIDEO_FIELDS = { title: 160, description: 1000 };

const str = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const fail = (res, status, message) => res.status(status).json({ success: false, message });

function handleError(res, error, label) {
  if (error instanceof mongoose.Error.ValidationError) {
    return fail(res, 400, Object.values(error.errors)[0]?.message || 'Lütfen alanları kontrol edin.');
  }

  if (error?.code === 11000) {
    return fail(res, 409, 'Bu kayıt zaten var (adres veya video tekrarlanıyor).');
  }

  console.error(`${label}:`, error);
  return fail(res, 500, 'İşlem tamamlanamadı.');
}

/* "https://youtu.be/ID", "watch?v=ID", "/shorts/ID", "/embed/ID" or a bare ID -> ID */
export function parseYoutubeId(value) {
  const text = str(value, 300);
  const match =
    text.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/) ||
    text.match(/^([A-Za-z0-9_-]{11})$/);

  return match ? match[1] : '';
}

const texts = (source, fields) =>
  Object.fromEntries(
    LANGS.map((lang) => [
      lang,
      Object.fromEntries(Object.entries(fields).map(([field, max]) => [field, str(source?.[lang]?.[field], max)])),
    ])
  );

const validId = (id) => mongoose.isValidObjectId(id);

/* ---------- Public snapshot parts ---------- */

export async function publicPosts() {
  const posts = await Post.find({ status: 'published', publishedAt: { $lte: new Date() } }).sort({ publishedAt: -1 });

  return posts.map((post) => ({
    slug: post.slug,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    coverImage: post.coverImage || '',
    youtubeId: post.youtubeId || '',
    relatedProducts: post.relatedProducts || [],
    i18n: texts(post.i18n, POST_FIELDS),
  }));
}

export async function publicVideos() {
  const videos = await Video.find({ published: true }).sort({ order: 1, createdAt: -1 });

  return videos.map((video) => ({
    youtubeId: video.youtubeId,
    uploadDate: video.uploadDate,
    i18n: texts(video.i18n, VIDEO_FIELDS),
  }));
}

/* ---------- Posts (admin) ---------- */

function postPayload(body = {}) {
  const payload = {
    slug: str(body.slug, 120).toLowerCase(),
    status: body.status === 'published' ? 'published' : 'draft',
    publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
    coverImage: str(body.coverImage, 300),
    youtubeId: parseYoutubeId(body.youtubeId),
    relatedProducts: Array.isArray(body.relatedProducts)
      ? body.relatedProducts.map((slug) => str(slug, 120)).filter(Boolean).slice(0, 6)
      : [],
    i18n: texts(body.i18n, POST_FIELDS),
  };

  if (payload.publishedAt && Number.isNaN(payload.publishedAt.getTime())) payload.publishedAt = null;
  if (payload.status === 'published' && !payload.publishedAt) payload.publishedAt = new Date();
  if (payload.coverImage && !payload.coverImage.startsWith('/uploads/')) payload.coverImage = '';

  return payload;
}

export async function listPosts(req, res) {
  try {
    const posts = await Post.find().sort({ updatedAt: -1 });
    return res.json({ success: true, data: posts });
  } catch (error) {
    return handleError(res, error, 'List posts error');
  }
}

export async function getPost(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Yazı bulunamadı.');
    const post = await Post.findById(req.params.id);
    return post ? res.json({ success: true, data: post }) : fail(res, 404, 'Yazı bulunamadı.');
  } catch (error) {
    return handleError(res, error, 'Get post error');
  }
}

export async function createPost(req, res) {
  try {
    const payload = postPayload(req.body);
    if (!payload.i18n.tr.title) return fail(res, 400, 'Türkçe başlık zorunludur.');
    if (!payload.slug) return fail(res, 400, 'Sayfa adresi (slug) zorunludur.');

    const post = await Post.create(payload);
    await markContentChanged();
    return res.status(201).json({ success: true, data: post });
  } catch (error) {
    return handleError(res, error, 'Create post error');
  }
}

export async function updatePost(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Yazı bulunamadı.');
    const payload = postPayload(req.body);
    if (!payload.i18n.tr.title) return fail(res, 400, 'Türkçe başlık zorunludur.');
    if (!payload.slug) return fail(res, 400, 'Sayfa adresi (slug) zorunludur.');

    const post = await Post.findByIdAndUpdate(req.params.id, payload, { returnDocument: 'after', runValidators: true });
    if (!post) return fail(res, 404, 'Yazı bulunamadı.');

    await markContentChanged();
    return res.json({ success: true, data: post });
  } catch (error) {
    return handleError(res, error, 'Update post error');
  }
}

export async function deletePost(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Yazı bulunamadı.');
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return fail(res, 404, 'Yazı bulunamadı.');
    await markContentChanged();
    return res.json({ success: true });
  } catch (error) {
    return handleError(res, error, 'Delete post error');
  }
}

/* ---------- Videos (admin) ---------- */

function videoPayload(body = {}) {
  const uploadDate = body.uploadDate ? new Date(body.uploadDate) : null;

  return {
    youtubeId: parseYoutubeId(body.youtubeId || body.url),
    published: body.published === undefined ? true : Boolean(body.published),
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : 0,
    uploadDate: uploadDate && !Number.isNaN(uploadDate.getTime()) ? uploadDate : null,
    i18n: texts(body.i18n, VIDEO_FIELDS),
  };
}

export async function listVideos(req, res) {
  try {
    const videos = await Video.find().sort({ order: 1, createdAt: -1 });
    return res.json({ success: true, data: videos });
  } catch (error) {
    return handleError(res, error, 'List videos error');
  }
}

export async function createVideo(req, res) {
  try {
    const payload = videoPayload(req.body);
    if (!payload.youtubeId) return fail(res, 400, 'Geçerli bir YouTube bağlantısı girin.');
    if (!payload.i18n.tr.title) return fail(res, 400, 'Türkçe başlık zorunludur.');

    const video = await Video.create(payload);
    await markContentChanged();
    return res.status(201).json({ success: true, data: video });
  } catch (error) {
    return handleError(res, error, 'Create video error');
  }
}

export async function updateVideo(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Video bulunamadı.');
    const payload = videoPayload(req.body);
    if (!payload.youtubeId) return fail(res, 400, 'Geçerli bir YouTube bağlantısı girin.');
    if (!payload.i18n.tr.title) return fail(res, 400, 'Türkçe başlık zorunludur.');

    const video = await Video.findByIdAndUpdate(req.params.id, payload, { returnDocument: 'after', runValidators: true });
    if (!video) return fail(res, 404, 'Video bulunamadı.');

    await markContentChanged();
    return res.json({ success: true, data: video });
  } catch (error) {
    return handleError(res, error, 'Update video error');
  }
}

export async function deleteVideo(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Video bulunamadı.');
    const video = await Video.findByIdAndDelete(req.params.id);
    if (!video) return fail(res, 404, 'Video bulunamadı.');
    await markContentChanged();
    return res.json({ success: true });
  } catch (error) {
    return handleError(res, error, 'Delete video error');
  }
}
