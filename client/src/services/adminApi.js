const API_BASE_URL = 'http://localhost:5000/api';

export async function adminLogin(payload) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Login failed.');
  }

  return data;
}

export async function getQuoteStats(token) {
  const response = await fetch(`${API_BASE_URL}/quote/stats`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Statistics could not be loaded.');
  }

  return data;
}
export async function getQuotes(
  token,
  {
    page = 1,
    limit = 10,
    status,
  } = {}
) {
  const params = new URLSearchParams();

  params.set(
    'page',
    String(page)
  );

  params.set(
    'limit',
    String(limit)
  );

  if (
    status &&
    status !== 'all'
  ) {
    params.set(
      'status',
      status
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/quote?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      'Quotes could not be loaded.'
    );
  }

  return data;
}

export async function getQuoteById(id, token) {
  const response = await fetch(`${API_BASE_URL}/quote/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Quote could not be loaded.');
  }

  return data;
}

export async function updateQuoteStatus(id, status, token) {
  const response = await fetch(`${API_BASE_URL}/quote/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      status,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Status could not be updated.');
  }

  return data;
}

export async function getUnreadQuoteCount(token) {
  const response = await fetch(
    `${API_BASE_URL}/quote/unread-count`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      'Unread count could not be loaded.'
    );
  }

  return data;
}