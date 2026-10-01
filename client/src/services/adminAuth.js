const TOKEN_KEY = 'rma_admin_token';
const USER_KEY = 'rma_admin_user';

function decodeTokenPayload(token) {
  try {
    const payload = token.split('.')[1];

    const json = atob(
      payload
        .replace(/-/g, '+')
        .replace(/_/g, '/')
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getAdminToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getAdminUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function saveAdminSession(token, admin) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(admin));
}

export function clearAdminSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // Storage unavailable — nothing to clear
  }
}

/* Token exists and has not passed its `exp` claim. */
export function hasValidAdminSession() {
  const token = getAdminToken();

  if (!token) {
    return false;
  }

  const payload = decodeTokenPayload(token);

  if (!payload) {
    return false;
  }

  if (payload.exp && payload.exp * 1000 <= Date.now()) {
    clearAdminSession();
    return false;
  }

  return true;
}

/* 401 means the session is gone; anything else is a normal error. */
export function isAuthError(error) {
  return error?.status === 401;
}

/* Lets admin pages tell the sidebar that unread counts may have changed. */
export const QUOTES_CHANGED_EVENT = 'rma:quotes-changed';

export function notifyQuotesChanged() {
  window.dispatchEvent(new Event(QUOTES_CHANGED_EVENT));
}
