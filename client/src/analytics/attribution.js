import { CONSENT_CHANGED, readConsent } from './consent';

/*
  Where the visitor came from, sent with a quote request or a catalogue
  download so the sales report can count requests per marketing channel
  (the server sorts it into a channel: server/services/attribution.js).

  Tied to the cookie choice (KVKK, Çerez Politikası 4.2 / 4.3):
  - Analytics: the first page of the visit, the outside site it came from and
    the campaign tags (utm_*) are kept for the visit (sessionStorage) and the
    last campaign / outside visit for 90 days (localStorage).
  - Marketing: the ad click id (gclid / fbclid) is kept the same way.
  - Neither: nothing is written to the device; a form only carries the page it
    was sent from.
  The visit is read when the site opens and held in memory, so a permission
  given later during the visit still records where it started.
*/

const VISIT_KEY = 'rma_visit';
const SOURCE_KEY = 'rma_source';
const KEEP_DAYS = 90;

const UTM = {
  utm_source: 'utmSource',
  utm_medium: 'utmMedium',
  utm_campaign: 'utmCampaign',
  utm_term: 'utmTerm',
  utm_content: 'utmContent',
};

const CLICK_IDS = ['gclid', 'fbclid'];
const CLICK_FIELDS = ['clickId', 'clickIdValue'];

let landing = null;

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

// Only the parts the visitor allowed
function allowed(visit, consent) {
  if (!visit || !consent || (!consent.analytics && !consent.marketing)) return null;

  const result = {};
  Object.entries(visit).forEach(([key, value]) => {
    const isClick = CLICK_FIELDS.includes(key);
    if ((isClick && consent.marketing) || (!isClick && consent.analytics) || key === 'firstSeenAt' || key === 'keepUntil') {
      result[key] = value;
    }
  });
  return result;
}

function store(consent) {
  const visit = allowed(landing, consent);
  if (!visit) return;

  const stored = read(sessionStorage, VISIT_KEY);
  if (!stored || hasCampaign(visit)) write(sessionStorage, VISIT_KEY, visit);

  if (hasSource(visit)) {
    write(localStorage, SOURCE_KEY, { ...visit, keepUntil: Date.now() + KEEP_DAYS * 864e5 });
  }
}

/* Called once when the site opens */
export function captureVisit() {
  if (typeof window === 'undefined') return undefined;

  landing = currentVisit();
  store(readConsent());

  const onChange = (event) => store(event.detail);
  window.addEventListener(CONSENT_CHANGED, onChange);
  return () => window.removeEventListener(CONSENT_CHANGED, onChange);
}

/* The source sent with a form: this visit, or the last campaign visit when this one is direct */
export function visitAttribution() {
  if (typeof window === 'undefined') return null;

  const submitPage = window.location.pathname;
  const consent = readConsent();
  if (!consent || (!consent.analytics && !consent.marketing)) return { submitPage };

  let visit = read(sessionStorage, VISIT_KEY) || allowed(landing, consent) || {};
  if (!hasSource(visit)) {
    const saved = read(localStorage, SOURCE_KEY);
    if (saved && saved.keepUntil > Date.now()) visit = saved;
  }

  const data = { ...allowed(visit, consent), submitPage };
  delete data.keepUntil;
  return data;
}
