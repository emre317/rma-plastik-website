/*
  All measurement goes through Google Tag Manager's dataLayer.
  GA4, Google Ads, Meta Pixel and Hotjar are configured inside GTM
  (see docs/analytics-seo-setup.md), so the site only pushes events.
*/

export function track(event, params = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}
