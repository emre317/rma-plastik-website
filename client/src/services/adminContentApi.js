import { ApiError, request } from './http';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

/* Texts */
export const listTexts = (token) => request('/admin/texts', { token, fallbackMessage: 'Metinler yüklenemedi.' });
export const saveTexts = (items, token) => request('/admin/texts', { method: 'PUT', body: { items }, token, fallbackMessage: 'Metinler kaydedilemedi.' });

/* Settings */
export const getSettings = (token) => request('/admin/settings', { token, fallbackMessage: 'Ayarlar yüklenemedi.' });
export const updateSettings = (body, token) => request('/admin/settings', { method: 'PUT', body, token, fallbackMessage: 'Ayarlar kaydedilemedi.' });

/* Blog posts */
export const listPosts = (token) => request('/admin/posts', { token, fallbackMessage: 'Yazılar yüklenemedi.' });
export const getPost = (id, token) => request(`/admin/posts/${encodeURIComponent(id)}`, { token, fallbackMessage: 'Yazı yüklenemedi.' });
export const createPost = (body, token) => request('/admin/posts', { method: 'POST', body, token, fallbackMessage: 'Yazı kaydedilemedi.' });
export const updatePost = (id, body, token) => request(`/admin/posts/${encodeURIComponent(id)}`, { method: 'PUT', body, token, fallbackMessage: 'Yazı kaydedilemedi.' });
export const deletePost = (id, token) => request(`/admin/posts/${encodeURIComponent(id)}`, { method: 'DELETE', token, fallbackMessage: 'Yazı silinemedi.' });

/* Videos */
export const listVideos = (token) => request('/admin/videos', { token, fallbackMessage: 'Videolar yüklenemedi.' });
export const createVideo = (body, token) => request('/admin/videos', { method: 'POST', body, token, fallbackMessage: 'Video kaydedilemedi.' });
export const updateVideo = (id, body, token) => request(`/admin/videos/${encodeURIComponent(id)}`, { method: 'PUT', body, token, fallbackMessage: 'Video kaydedilemedi.' });
export const deleteVideo = (id, token) => request(`/admin/videos/${encodeURIComponent(id)}`, { method: 'DELETE', token, fallbackMessage: 'Video silinemedi.' });

/* Publishing */
export const getPublishStatus = (token) => request('/admin/publish', { token, fallbackMessage: 'Yayın durumu alınamadı.' });
export const startPublish = (token) => request('/admin/publish', { method: 'POST', token, fallbackMessage: 'Yayınlama başlatılamadı.' });

/* Image upload (multipart, so not through request()) */
export const uploadProductImage = (file, token) => uploadImage('product-image', file, token);
export const uploadPostImage = (file, token) => uploadImage('post-image', file, token);
export const uploadProjectImage = (file, token) => uploadImage('project-image', file, token);

async function uploadImage(kind, file, token) {
  const form = new FormData();
  form.append('image', file);

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/admin/uploads/${kind}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    throw new ApiError('Sunucuya ulaşılamadı.', 0);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.message || 'Görsel yüklenemedi.', response.status);
  }

  return data;
}

/* Product tables (Ürün tabloları) */
export const listFamilies = (token) => request('/admin/product-families', { token, fallbackMessage: 'Ürün tabloları yüklenemedi.' });
export const getFamily = (id, token) => request(`/admin/product-families/${encodeURIComponent(id)}`, { token, fallbackMessage: 'Ürün ailesi yüklenemedi.' });
export const createFamily = (body, token) => request('/admin/product-families', { method: 'POST', body, token, fallbackMessage: 'Ürün ailesi kaydedilemedi.' });
export const updateFamily = (id, body, token) => request(`/admin/product-families/${encodeURIComponent(id)}`, { method: 'PUT', body, token, fallbackMessage: 'Ürün ailesi kaydedilemedi.' });
export const deleteFamily = (id, token) => request(`/admin/product-families/${encodeURIComponent(id)}`, { method: 'DELETE', token, fallbackMessage: 'Ürün ailesi silinemedi.' });
export const importFamilies = (token) => request('/admin/product-families/import-defaults', { method: 'POST', token, fallbackMessage: 'Broşür tabloları aktarılamadı.' });

/* Reference projects (Referans projeler) */
export const listProjects = (token) => request('/admin/projects', { token, fallbackMessage: 'Projeler yüklenemedi.' });
export const createProject = (body, token) => request('/admin/projects', { method: 'POST', body, token, fallbackMessage: 'Proje kaydedilemedi.' });
export const updateProject = (id, body, token) => request(`/admin/projects/${encodeURIComponent(id)}`, { method: 'PUT', body, token, fallbackMessage: 'Proje kaydedilemedi.' });
export const deleteProject = (id, token) => request(`/admin/projects/${encodeURIComponent(id)}`, { method: 'DELETE', token, fallbackMessage: 'Proje silinemedi.' });
export const importProjects = (token) => request('/admin/projects/import-defaults', { method: 'POST', token, fallbackMessage: 'Broşür projeleri aktarılamadı.' });

/* Export markets (İhracat ağı) */
export const listExportMarkets = (token) => request('/admin/export-markets', { token, fallbackMessage: 'Pazarlar yüklenemedi.' });
export const createExportMarket = (body, token) => request('/admin/export-markets', { method: 'POST', body, token, fallbackMessage: 'Pazar kaydedilemedi.' });
export const updateExportMarket = (id, body, token) => request(`/admin/export-markets/${encodeURIComponent(id)}`, { method: 'PUT', body, token, fallbackMessage: 'Pazar kaydedilemedi.' });
export const deleteExportMarket = (id, token) => request(`/admin/export-markets/${encodeURIComponent(id)}`, { method: 'DELETE', token, fallbackMessage: 'Pazar silinemedi.' });
export const importExportMarkets = (token) => request('/admin/export-markets/import-defaults', { method: 'POST', token, fallbackMessage: 'Broşür pazarları aktarılamadı.' });
