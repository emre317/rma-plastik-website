import { request } from './http';

export function submitQuote(payload) {
  return request('/quote', {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Quote request could not be submitted.',
  });
}

export function submitCatalogLead(payload) {
  return request('/leads/catalog', {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Request could not be completed.',
  });
}
