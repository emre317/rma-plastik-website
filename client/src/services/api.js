const API_BASE_URL = 'http://localhost:5000/api';

export async function submitQuote(payload) {
  const response = await fetch(`${API_BASE_URL}/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || 'Quote request could not be submitted.'
    );
  }

  return data;
}