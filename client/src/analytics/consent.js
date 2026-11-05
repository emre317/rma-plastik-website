import { track } from './track';

/*
  Cookie consent stored in the browser and forwarded to Google Consent Mode v2.
  Basic mode (KVKK): GTM is not loaded at all until the visitor allows
  analytics or marketing; the inline script in index.html (vite.config.js)
  applies a saved choice and loads GTM on the next visits.

  - Version 2: choices made with the old banner text (version 1) no longer
    count, so everybody is asked again.
  - A choice is kept for 12 months, then the banner is shown again.
  - Taking a permission back deletes what it allowed (cookies, visit source,
    click ids); if GTM was already running, the page is reloaded without it.
*/

const STORAGE_KEY = 'rma_consent';
const VERSION = 2;
const KEEP_MS = 365 * 864e5;

export const CONSENT_EVENT = 'rma:consent-open';
export const CONSENT_CHANGED = 'rma:consent-changed';

export function readConsent() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (value?.version !== VERSION) return null;
    if (!(Date.now() - new Date(value.savedAt).getTime() < KEEP_MS)) return null;
    return value;
  } catch {
    return null;
  }
}

function toConsentMode({ analytics, marketing }) {
  return {
    analytics_storage: analytics ? 'granted' : 'denied',
    ad_storage: marketing ? 'granted' : 'denied',
    ad_user_data: marketing ? 'granted' : 'denied',
    ad_personalization: marketing ? 'granted' : 'denied',
  };
}

// Cookies are set on the bare host and on the parent domain (.rmaplastik.com)
function deleteCookies(matches) {
  const host = window.location.hostname;
  const domains = ['', host, `.${host.replace(/^www\./, '')}`];

  document.cookie.split(';').map((part) => part.split('=')[0].trim()).filter(matches).forEach((name) => {
    domains.forEach((domain) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ''}`;
    });
  });
}

function removeStored(storage, key) {
  try {
    storage.removeItem(key);
  } catch {
    // Storage blocked: nothing was stored either
  }
}

function clearAnalytics() {
  deleteCookies((name) => name === '_ga' || name.startsWith('_ga_'));
  removeStored(sessionStorage, 'rma_visit');
  removeStored(localStorage, 'rma_source');
}

function clearMarketing() {
  deleteCookies((name) => name.startsWith('_gcl_') || name === '_fbp' || name === '_fbc');
  removeStored(localStorage, '_gcl_ls');
  // Saved click ids (gclid / fbclid) live in the visit records
  [[sessionStorage, 'rma_visit'], [localStorage, 'rma_source']].forEach(([storage, key]) => {
    try {
      const value = JSON.parse(storage.getItem(key));
      if (value && (value.clickId || value.clickIdValue)) {
        delete value.clickId;
        delete value.clickIdValue;
        storage.setItem(key, JSON.stringify(value));
      }
    } catch {
      // Unreadable: leave it
    }
  });
}

export function saveConsent({ analytics, marketing }) {
  const before = readConsent();
  const value = {
    version: VERSION,
    analytics: Boolean(analytics),
    marketing: Boolean(marketing),
    savedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage blocked: the choice applies to this visit only
  }

  const withdrawnAnalytics = before?.analytics && !value.analytics;
  const withdrawnMarketing = before?.marketing && !value.marketing;
  if (!value.analytics) clearAnalytics();
  if (!value.marketing) clearMarketing();

  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', toConsentMode(value));
  }

  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED, { detail: value }));

  // GTM already running with a permission that was just taken back: start clean
  if (window.rmaGtmLoaded && (withdrawnAnalytics || withdrawnMarketing)) {
    window.location.reload();
    return value;
  }

  if (value.analytics || value.marketing) {
    window.rmaLoadGtm?.();
    track('consent_update', {
      consent_analytics: value.analytics ? 'granted' : 'denied',
      consent_marketing: value.marketing ? 'granted' : 'denied',
    });
  }

  return value;
}

export function openConsentSettings() {
  window.dispatchEvent(new Event(CONSENT_EVENT));
}
