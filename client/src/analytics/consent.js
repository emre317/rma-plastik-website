import { track } from './track';

/*
  Cookie consent stored in the browser and forwarded to Google Consent Mode v2.
  Default (before a choice) is "denied" for analytics and ads; that default is
  set by an inline script in index.html before GTM loads.
*/

const STORAGE_KEY = 'rma_consent';
const VERSION = 1;

export const CONSENT_EVENT = 'rma:consent-open';

export function readConsent() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));

    return value?.version === VERSION ? value : null;
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

export function saveConsent({ analytics, marketing }) {
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

  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', toConsentMode(value));
  }

  track('consent_update', {
    consent_analytics: value.analytics ? 'granted' : 'denied',
    consent_marketing: value.marketing ? 'granted' : 'denied',
  });

  return value;
}

export function openConsentSettings() {
  window.dispatchEvent(new Event(CONSENT_EVENT));
}
