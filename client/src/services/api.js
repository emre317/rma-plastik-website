import { ApiError, request } from './http';

export function submitQuote(payload) {
  return request('/quote', {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Quote request could not be submitted.',
  });
}

/* Taken slots of the meeting calendar: { taken: { '2026-11-10': ['10:00'] } } */
export function getMeetingAvailability() {
  return request('/meetings/availability', { fallbackMessage: 'Availability could not be loaded.' });
}

export function submitMeeting(payload) {
  return request('/meetings', {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Meeting request could not be sent.',
  });
}

export function submitCatalogLead(payload) {
  return request('/leads/catalog', {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Request could not be completed.',
  });
}

/*
  Custom project brief with its drawings (multipart: `data` + `files`),
  so it does not go through request() (JSON only).
*/
export async function submitProject(payload, files = []) {
  const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
  const form = new FormData();
  form.append('data', JSON.stringify(payload));
  files.forEach((file) => form.append('files', file, file.name));

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/quote/project`, { method: 'POST', body: form });
  } catch {
    throw new ApiError('Network error.', 0);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.message || 'Project could not be submitted.', response.status);
  }

  return data;
}
