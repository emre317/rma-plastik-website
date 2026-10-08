/*
  Visit source sent with a quote request or catalogue download
  (client/src/analytics/attribution.js): cleaned up and sorted into a
  marketing channel, so the sales report can count requests per channel.
*/

export const CHANNELS = {
  googleAds: 'Google Ads',
  paidSocial: 'Sosyal Medya Reklamı',
  otherAds: 'Diğer Reklam',
  email: 'E-posta',
  organic: 'Organik Arama',
  social: 'Sosyal Medya',
  referral: 'Yönlendiren Site',
  campaign: 'Diğer Kampanya',
  direct: 'Doğrudan',
};

const SEARCH_ENGINES = /(^|\.)(google|bing|yandex|duckduckgo|yahoo|baidu|ecosia|qwant|naver|seznam)\./i;
const SOCIAL_SITES = /(^|\.)(facebook|instagram|linkedin|lnkd\.in|t\.co|twitter|x\.com|youtube|youtu\.be|tiktok|pinterest|whatsapp|wa\.me|telegram|reddit)(\.|$)/i;
const SOCIAL_SOURCES = /^(facebook|fb|instagram|ig|meta|linkedin|twitter|x|youtube|tiktok|pinterest|whatsapp|telegram)$/i;
const PAID_MEDIUMS = /^(cpc|ppc|paid|paidsearch|paid_search|paid-social|paid_social|paidsocial|cpm|display|banner|ads?)$/i;

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

// Only the host and path of an outside page (no query string: it may hold personal data)
function cleanUrl(value) {
  const raw = text(value, 1000);
  if (!raw) return '';

  try {
    const url = new URL(raw);
    if (!/^https?:$/.test(url.protocol)) return '';
    return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`.slice(0, 300);
  } catch {
    return '';
  }
}

// Site path only, e.g. "/en/water-tanks"
function cleanPath(value) {
  const raw = text(value, 300);
  return raw.startsWith('/') && !raw.startsWith('//') ? raw.split(/[?#]/)[0] : '';
}

function hostOf(referrer) {
  return referrer.split('/')[0] || '';
}

export function channelOf({ utmSource = '', utmMedium = '', clickId = '', referrer = '' }) {
  const source = utmSource.toLowerCase();
  const medium = utmMedium.toLowerCase();
  const host = hostOf(referrer);

  if (clickId === 'gclid' || (source === 'google' && PAID_MEDIUMS.test(medium))) return CHANNELS.googleAds;
  // Facebook adds fbclid to every outgoing link, paid or not: only a paid utm_medium marks an ad
  if (SOCIAL_SOURCES.test(source) && PAID_MEDIUMS.test(medium)) return CHANNELS.paidSocial;
  if (clickId === 'fbclid' && !medium) return CHANNELS.social;
  if (clickId === 'msclkid' || PAID_MEDIUMS.test(medium)) return CHANNELS.otherAds;
  if (/^(e-?mail|newsletter|bulten|bülten)$/i.test(medium) || /^(e-?mail|newsletter)$/i.test(source)) return CHANNELS.email;
  if (SOCIAL_SOURCES.test(source) || medium === 'social') return CHANNELS.social;
  if (medium === 'organic') return CHANNELS.organic;
  if (source || medium) return CHANNELS.campaign;
  if (host && SEARCH_ENGINES.test(`${host}.`)) return CHANNELS.organic;
  if (host && SOCIAL_SITES.test(host)) return CHANNELS.social;
  if (host) return CHANNELS.referral;
  return CHANNELS.direct;
}

/* Request body value -> stored attribution (null when nothing was sent) */
export function cleanAttribution(value) {
  if (!value || typeof value !== 'object') return null;

  const clickIds = ['gclid', 'fbclid', 'msclkid'];
  const clickId = clickIds.includes(value.clickId) ? value.clickId : '';

  const result = {
    landingPage: cleanPath(value.landingPage),
    submitPage: cleanPath(value.submitPage),
    referrer: cleanUrl(value.referrer),
    utmSource: text(value.utmSource, 100),
    utmMedium: text(value.utmMedium, 100),
    utmCampaign: text(value.utmCampaign, 150),
    utmTerm: text(value.utmTerm, 150),
    utmContent: text(value.utmContent, 150),
    clickId,
    clickIdValue: clickId ? text(value.clickIdValue, 200).replace(/[^\w.-]/g, '') : '',
    firstSeenAt: null,
  };

  const seen = new Date(value.firstSeenAt);
  if (!Number.isNaN(seen.getTime()) && seen <= new Date() && seen > new Date(Date.now() - 400 * 864e5)) {
    result.firstSeenAt = seen;
  }

  result.channel = channelOf(result);

  return result;
}
