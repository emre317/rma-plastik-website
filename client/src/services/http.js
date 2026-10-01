const API_BASE_URL = (
  import.meta.env.VITE_API_URL || '/api'
).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);

    this.name = 'ApiError';
    this.status = status;
  }
}

export async function request(
  path,
  {
    method = 'GET',
    body,
    token,
    fallbackMessage = 'Request failed.',
  } = {}
) {
  const headers = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body:
        body !== undefined
          ? JSON.stringify(body)
          : undefined,
    });
  } catch {
    throw new ApiError(
      'Could not reach the server. Please check your connection and try again.',
      0
    );
  }

  // Non-JSON responses (proxy errors, HTML pages) must not crash the caller.
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.message || fallbackMessage,
      response.status
    );
  }

  return data;
}
