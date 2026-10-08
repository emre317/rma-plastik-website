import { ApiError, request } from './http';

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

function quoteParams({ status, search, assignee, followUp, from, to, outcome, channel } = {}) {
  const params = new URLSearchParams();

  if (status && status !== 'all') {
    params.set('status', status);
  }

  if (search?.trim()) {
    params.set('search', search.trim());
  }

  if (assignee) params.set('assignee', assignee);
  if (followUp) params.set('followUp', followUp);
  if (outcome) params.set('outcome', outcome);
  if (channel) params.set('channel', channel);
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

export function saveQuoteOffer(id, offer, token) {
  return request(`/quote/${encodeURIComponent(id)}/offer`, {
    method: 'PUT',
    body: offer,
    token,
    fallbackMessage: 'Teklif kaydedilemedi.',
  });
}

/* PDF made in the browser, sent as a file (multipart, so not through request()) */
export async function sendQuoteOffer(id, pdfBlob, filename, token) {
  const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
  const form = new FormData();
  form.append('pdf', pdfBlob, filename);

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/quote/${encodeURIComponent(id)}/offer/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    throw new ApiError('Sunucuya ulaşılamadı.', 0);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.message || 'Teklif gönderilemedi.', response.status);
  }

  return data;
}

/* Catalogue downloads (potential customers) */

function leadParams({ search, consent } = {}) {
  const params = new URLSearchParams();
  if (search?.trim()) params.set('search', search.trim());
  if (consent) params.set('consent', consent);
  return params;
}

export function getLeads({ page = 1, limit = 20, ...filters } = {}, token) {
  const params = leadParams(filters);
  params.set('page', String(page));
  params.set('limit', String(limit));

  return request(`/leads?${params.toString()}`, {
    token,
    fallbackMessage: 'Potansiyel müşteriler yüklenemedi.',
  });
}

export function exportLeads(filters, token) {
  return request(`/leads/export?${leadParams(filters).toString()}`, {
    token,
    fallbackMessage: 'Liste dışa aktarılamadı.',
  });
}

export function getUnreadLeadCount(token) {
  return request('/leads/unread-count', {
    token,
    fallbackMessage: 'Yeni kayıt sayısı alınamadı.',
  });
}

export function markLeadsRead(token) {
  return request('/leads/read', {
    method: 'POST',
    token,
    fallbackMessage: 'Kayıtlar güncellenemedi.',
  });
}

export function deleteLead(id, token) {
  return request(`/leads/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
    fallbackMessage: 'Kayıt silinemedi.',
  });
}
