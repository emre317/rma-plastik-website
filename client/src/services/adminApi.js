import { request } from './http';

export function adminLogin(payload) {
  return request('/auth/login', {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Login failed.',
  });
}

export function getQuoteStats(token) {
  return request('/quote/stats', {
    token,
    fallbackMessage: 'Statistics could not be loaded.',
  });
}

export function getQuotes(
  token,
  {
    page = 1,
    limit = 10,
    status,
    search,
  } = {}
) {
  const params = new URLSearchParams();

  params.set('page', String(page));
  params.set('limit', String(limit));

  if (status && status !== 'all') {
    params.set('status', status);
  }

  if (search?.trim()) {
    params.set('search', search.trim());
  }

  return request(`/quote?${params.toString()}`, {
    token,
    fallbackMessage: 'Quotes could not be loaded.',
  });
}

export function getQuoteById(id, token) {
  return request(`/quote/${encodeURIComponent(id)}`, {
    token,
    fallbackMessage: 'Quote could not be loaded.',
  });
}

export function updateQuoteStatus(id, status, token) {
  return request(`/quote/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: { status },
    token,
    fallbackMessage: 'Status could not be updated.',
  });
}

export function getUnreadQuoteCount(token) {
  return request('/quote/unread-count', {
    token,
    fallbackMessage: 'Unread count could not be loaded.',
  });
}
