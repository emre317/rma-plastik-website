import { readConsent } from './consent';

/*
  Where the visitor came from, sent with a quote request or a catalogue
  download so the sales report can count requests per marketing channel
  (the server sorts it into a channel: server/services/attribution.js).

  - The first page of the visit, the outside site it came from and the
    campaign tags (utm_*, gclid / fbclid / msclkid) are kept for the visit
    (sessionStorage). A new campaign click during the visit replaces them.
  - With analytics consent the last campaign / outside visit is also kept for
    30 days, so a visitor who first came from an ad and returns directly
    later is still counted for that ad.
  - Nothing is sent anywhere until the visitor submits a form.
*/

const VISIT_KEY = 'rma_visit';
const SOURCE_KEY = 'rma_source';
const KEEP_DAYS = 30;

const UTM = {
  utm_source: 'utmSource',
  utm_medium: 'utmMedium',
  utm_campaign: 'utmCampaign',
  utm_term: 'utmTerm',
  utm_content: 'utmContent',
};

const CLICK_IDS = ['gclid', 'fbclid', 'msclkid'];

function read(storage, key) {
  try {
    return JSON.parse(storage.getItem(key)) || null;
  } catch {
    return null;
  }
}

function write(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: the source is simply not recorded
  }
}

const hasSource = (visit) => Boolean(visit && (visit.referrer || visit.utmSource || visit.utmMedium || visit.utmCampaign || visit.clickId));
const hasCampaign = (visit) => Boolean(visit && (visit.utmSource || visit.utmMedium || visit.utmCampaign || visit.clickId));

function currentVisit() {
  const params = new URLSearchParams(window.location.search);
  const visit = { landingPage: window.location.pathname, firstSeenAt: new Date().toISOString() };

  Object.entries(UTM).forEach(([param, key]) => {
    const value = params.get(param);
    if (value) visit[key] = value.slice(0, 150);
  });

  const clickId = CLICK_IDS.find((id) => params.get(id));
  if (clickId) {
    visit.clickId = clickId;
    visit.clickIdValue = params.get(clickId).slice(0, 200);
  }

  // Only outside sites count as a referrer (not our own pages)
  try {
    const referrer = document.referrer ? new URL(document.referrer) : null;
    if (referrer && referrer.host !== window.location.host) visit.referrer = `${referrer.origin}${referrer.pathname}`;
  } catch {
    // Unreadable referrer: treated as direct
  }

  return visit;
}

/* Called once when the site opens */
export function captureVisit() {
  if (typeof window === 'undefined') return;

  const visit = currentVisit();
  const stored = read(sessionStorage, VISIT_KEY);

  if (!stored || hasCampaign(visit)) write(sessionStorage, VISIT_KEY, visit);

  if (hasSource(visit) && readConsent()?.analytics) {
    write(localStorage, SOURCE_KEY, { ...visit, keepUntil: Date.now() + KEEP_DAYS * 864e5 });
  }
}

/* The source sent with a form: this visit, or the last campaign visit when this one is direct */
export function visitAttribution() {
  if (typeof window === 'undefined') return null;

  let visit = read(sessionStorage, VISIT_KEY) || currentVisit();

  if (!hasSource(visit) && readConsent()?.analytics) {
    const saved = read(localStorage, SOURCE_KEY);
    if (saved && saved.keepUntil > Date.now()) visit = saved;
  }

  const data = { ...visit, submitPage: window.location.pathname };
  delete data.keepUntil;
  return data;
}
