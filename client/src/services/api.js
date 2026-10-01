import { request } from './http';

export function submitQuote(payload) {
  return request('/quote', {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Quote request could not be submitted.',
  });
}
