import { readConsent } from './consent';

/*
  Google Ads enhanced conversions: the e-mail and phone from the quote form,
  normalised and SHA-256 hashed in the browser, sent as `user_data` with the
  generate_lead event. GTM's "Ads – Teklif Talebi" tag reads them through a
  User-Provided Data variable (docs/analytics-seo-setup.md, 3.10).

  - Only with marketing consent (Consent Mode ad_user_data); otherwise nothing.
  - The plain e-mail or phone never goes into the dataLayer.
*/

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Lower case, no spaces; Gmail ignores dots in the name part
export function normaliseEmail(value) {
  const email = String(value || '').trim().toLowerCase().replace(/\s+/g, '');
  const [name, domain] = email.split('@');
  if (!name || !domain) return '';
  return ['gmail.com', 'googlemail.com'].includes(domain) ? `${name.replace(/\./g, '')}@${domain}` : email;
}

// E.164 (+905321234567); numbers without a country code are left out
export function normalisePhone(value) {
  const phone = String(value || '').trim().replace(/^00/, '+');
  if (!phone.startsWith('+')) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : '';
}

/* { sha256_email_address, sha256_phone_number } or null */
export async function hashedUserData({ email, phone }) {
  if (typeof window === 'undefined' || !window.crypto?.subtle || !readConsent()?.marketing) return null;

  try {
    const data = {};
    const cleanEmail = normaliseEmail(email);
    const cleanPhone = normalisePhone(phone);
    if (cleanEmail) data.sha256_email_address = await sha256(cleanEmail);
    if (cleanPhone) data.sha256_phone_number = await sha256(cleanPhone);
    return Object.keys(data).length ? data : null;
  } catch {
    return null;
  }
}

/* GTM keeps pushed values for later events: forget the hashes once the conversion is sent */
export function clearUserData() {
  if (typeof window === 'undefined' || !window.dataLayer) return;
  window.dataLayer.push({ user_data: undefined });
}
