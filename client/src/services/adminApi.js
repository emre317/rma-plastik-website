import { request } from './http';

export function adminLogin(payload) {
  return request('/auth/login', {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Giriş yapılamadı.',
  });
}

export function getQuoteStats(token) {
  return request('/quote/stats', {
    token,
    fallbackMessage: 'İstatistikler yüklenemedi.',
  });
}

function quoteParams({ status, search, assignee, followUp, from, to } = {}) {
  const params = new URLSearchParams();

  if (status && status !== 'all') {
    params.set('status', status);
  }

  if (search?.trim()) {
    params.set('search', search.trim());
  }

  if (assignee) params.set('assignee', assignee);
  if (followUp) params.set('followUp', followUp);
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  return params;
}

export function getQuotes(
  token,
  {
    page = 1,
    limit = 10,
    ...filters
  } = {}
) {
  const params = quoteParams(filters);

  params.set('page', String(page));
  params.set('limit', String(limit));

  return request(`/quote?${params.toString()}`, {
    token,
    fallbackMessage: 'Teklif talepleri yüklenemedi.',
  });
}

export function getQuoteById(id, token) {
  return request(`/quote/${encodeURIComponent(id)}`, {
    token,
    fallbackMessage: 'Teklif talebi yüklenemedi.',
  });
}

export function updateQuoteStatus(id, status, token) {
  return request(`/quote/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: { status },
    token,
    fallbackMessage: 'Durum güncellenemedi.',
  });
}

export function getUnreadQuoteCount(token) {
  return request('/quote/unread-count', {
    token,
    fallbackMessage: 'Okunmamış sayısı alınamadı.',
  });
}

export function exportQuotes(filters, token) {
  return request(`/quote/export?${quoteParams(filters).toString()}`, {
    token,
    fallbackMessage: 'Talepler dışa aktarılamadı.',
  });
}

export function getQuoteReport({ from, to } = {}, token) {
  return request(`/quote/report?${quoteParams({ from, to }).toString()}`, {
    token,
    fallbackMessage: 'Rapor yüklenemedi.',
  });
}

export function getQuoteAssignees(token) {
  return request('/quote/assignees', {
    token,
    fallbackMessage: 'Atanan kişiler yüklenemedi.',
  });
}

export function updateQuoteTracking(id, changes, token) {
  return request(`/quote/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: changes,
    token,
    fallbackMessage: 'Takip bilgisi kaydedilemedi.',
  });
}

export function addQuoteNote(id, text, token) {
  return request(`/quote/${encodeURIComponent(id)}/notes`, {
    method: 'POST',
    body: { text },
    token,
    fallbackMessage: 'Not kaydedilemedi.',
  });
}

export function deleteQuoteNote(id, noteId, token) {
  return request(`/quote/${encodeURIComponent(id)}/notes/${encodeURIComponent(noteId)}`, {
    method: 'DELETE',
    token,
    fallbackMessage: 'Not silinemedi.',
  });
}
