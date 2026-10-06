import { ApiError, request } from './http';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

/* Products */
export const listProducts = (token) => request('/admin/products', { token, fallbackMessage: 'Ürünler yüklenemedi.' });
export const getProduct = (id, token) => request(`/admin/products/${encodeURIComponent(id)}`, { token, fallbackMessage: 'Ürün yüklenemedi.' });
export const createProduct = (body, token) => request('/admin/products', { method: 'POST', body, token, fallbackMessage: 'Ürün kaydedilemedi.' });
export const updateProduct = (id, body, token) => request(`/admin/products/${encodeURIComponent(id)}`, { method: 'PUT', body, token, fallbackMessage: 'Ürün kaydedilemedi.' });
export const deleteProduct = (id, token) => request(`/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE', token, fallbackMessage: 'Ürün silinemedi.' });

/* Texts */
export const listTexts = (token) => request('/admin/texts', { token, fallbackMessage: 'Metinler yüklenemedi.' });
export const saveTexts = (items, token) => request('/admin/texts', { method: 'PUT', body: { items }, token, fallbackMessage: 'Metinler kaydedilemedi.' });

/* Settings */
export const getSettings = (token) => request('/admin/settings', { token, fallbackMessage: 'Ayarlar yüklenemedi.' });
export const updateSettings = (body, token) => request('/admin/settings', { method: 'PUT', body, token, fallbackMessage: 'Ayarlar kaydedilemedi.' });

/* Publishing */
export const getPublishStatus = (token) => request('/admin/publish', { token, fallbackMessage: 'Yayın durumu alınamadı.' });
export const startPublish = (token) => request('/admin/publish', { method: 'POST', token, fallbackMessage: 'Yayınlama başlatılamadı.' });

/* Image upload (multipart, so not through request()) */
export async function uploadProductImage(file, token) {
  const form = new FormData();
  form.append('image', file);

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/admin/uploads/product-image`, {
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
