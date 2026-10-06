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
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // No JSON from a 5xx = the API itself did not answer (e.g. the dev proxy
    // could not reach the server on port 5000)
    if (!data && response.status >= 500) {
      throw new ApiError(
        'API sunucusuna ulaşılamıyor. "server" klasöründe "npm run dev" çalışıyor mu? / The API server is not reachable.',
        0
      );
    }

    throw new ApiError(
      data?.message || fallbackMessage,
      response.status
    );
  }

  return data || {};
}
