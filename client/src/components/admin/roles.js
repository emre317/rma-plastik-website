/*
  Panel roles (server: models/AdminUser.js ROLE_AREAS).
  Areas: sales (requests, proformas, report, potential customers),
  content (products, blog, texts, publishing), settings, users, audit.
*/
export const ROLES = [
  { id: 'admin', label: 'Yönetici', tone: 'blue', text: 'Tüm bölümler, kullanıcılar, site ayarları ve işlem geçmişi.' },
  { id: 'sales', label: 'Satış', tone: 'green', text: 'Teklif talepleri, proforma, satış raporu ve potansiyel müşteriler.' },
  { id: 'content', label: 'İçerik', tone: 'violet', text: 'Ürün tabloları, blog, projeler, fotoğraflar, SSS, videolar, metinler ve yayınlama.' },
];

const AREAS = {
  admin: ['sales', 'content', 'settings', 'users', 'audit'],
  sales: ['sales'],
  content: ['content'],
};

export const roleLabel = (id) => ROLES.find((role) => role.id === id)?.label || 'Yönetici';
export const roleTone = (id) => ROLES.find((role) => role.id === id)?.tone || 'blue';

// Accounts saved before roles existed are admins
export const can = (role, area) => !area || (AREAS[role || 'admin'] || []).includes(area);
