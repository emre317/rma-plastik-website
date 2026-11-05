import ConsentRecord from '../models/ConsentRecord.js';
import Lead from '../models/Lead.js';
import Suppression from '../models/Suppression.js';
import { consentExpiry, leadExpiry } from './retention.js';

/*
  Consent boxes of the website forms (KVKK set, section 2). Versions change
  together with the texts on /kvkk (client/src/pages/Legal); a new version is
  what makes an old consent distinguishable from a new one.
*/
export const TEXT_VERSIONS = { A: 'A-v1.0', B: 'B-v1.0', C: 'C-v1.0' };

// The boxes each form shows (the catalogue form asks for e-mail only)
export const FORM_BOXES = {
  quote: ['A', 'B-email', 'B-sms', 'B-call', 'C'],
  catalog: ['A', 'B-email', 'C'],
};

// Request body keys (client/src/components/forms/ConsentBoxes.jsx)
const BODY_KEYS = { A: 'a', 'B-email': 'bEmail', 'B-sms': 'bSms', 'B-call': 'bCall', C: 'c' };

const MARKETING_BOXES = ['A', 'B-email', 'B-sms', 'B-call'];

/* { A: true, 'B-email': false, … } for the boxes of a form; anything but true is "no" */
export function readConsents(body, form) {
  const sent = body && typeof body === 'object' ? body : {};
  return Object.fromEntries(FORM_BOXES[form].map((box) => [box, sent[BODY_KEYS[box]] === true]));
}

export const hasMarketing = (consents) => MARKETING_BOXES.some((box) => consents[box]);

const digits = (phone) => String(phone || '').replace(/\D/g, '');

/* One record per box (ticked or not) */
export async function recordConsents({ form, refId, consents, contact = {}, language = '' }) {
  const now = new Date();
  const docs = Object.entries(consents).map(([box, value]) => ({
    box,
    value,
    textVersion: TEXT_VERSIONS[box[0]],
    form,
    refId: refId || null,
    language,
    email: contact.email || '',
    phone: contact.phone || '',
    name: contact.name || '',
    company: contact.company || '',
    country: contact.country || '',
    givenAt: now,
    // A "no" is kept as long as a withdrawn consent would be
    expireAt: value ? null : consentExpiry(now),
  }));

  await Promise.all(docs.map((doc) => ConsentRecord.create(doc)));

  // A fresh marketing consent lifts an earlier opt-out for that contact
  const given = docs.filter((doc) => doc.value && MARKETING_BOXES.includes(doc.box));
  if (given.some((doc) => doc.box !== 'B-sms' && doc.box !== 'B-call') && contact.email) {
    await Suppression.deleteOne({ type: 'email', value: contact.email.toLowerCase() });
  }
  if (given.some((doc) => doc.box === 'B-sms' || doc.box === 'B-call') && digits(contact.phone)) {
    await Suppression.deleteOne({ type: 'phone', value: digits(contact.phone) });
  }

  return docs;
}

/* Takes back every standing consent of an e-mail address (asked for by the person) */
export async function withdrawConsents(email) {
  const address = String(email || '').trim().toLowerCase();
  if (!address) return { withdrawn: 0 };

  const now = new Date();
  const records = await ConsentRecord.find({ email: address, value: true, withdrawnAt: null });

  for (const record of records) {
    record.withdrawnAt = now;
    record.expireAt = consentExpiry(now);
    await record.save();
  }

  const phones = [...new Set(records.map((record) => digits(record.phone)).filter(Boolean))];
  const entries = [{ type: 'email', value: address }, ...phones.map((value) => ({ type: 'phone', value }))];
  for (const entry of entries) {
    await Suppression.updateOne(entry, { $set: { ...entry, withdrawnAt: now } }, { upsert: true });
  }

  // The catalogue record falls back to the normal 2-year rule
  await Lead.updateOne({ email: address }, { $set: { marketingConsent: false, expireAt: leadExpiry(now) } });

  return { withdrawn: records.length, suppressed: entries.length };
}

/* Is this contact on the opt-out list? (check before any marketing send) */
export async function isSuppressed({ email, phone } = {}) {
  const or = [];
  if (email) or.push({ type: 'email', value: String(email).toLowerCase() });
  if (digits(phone)) or.push({ type: 'phone', value: digits(phone) });
  if (!or.length) return false;
  return Boolean(await Suppression.exists({ $or: or }));
}

// Free mail services: a catalogue download from these is not followed up by sales
const PERSONAL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.com.tr', 'outlook.com', 'outlook.com.tr', 'live.com', 'msn.com',
  'yahoo.com', 'yahoo.com.tr', 'ymail.com', 'yandex.com', 'yandex.com.tr', 'yandex.ru', 'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'mail.com', 'gmx.com', 'gmx.de', 'proton.me', 'protonmail.com', 'mail.ru',
]);

export const isPersonalEmail = (email) => PERSONAL_DOMAINS.has(String(email || '').split('@')[1]?.toLowerCase() || '');

/* Catalogue lead that sales may follow up (company given, business e-mail) – KVKK technical note B.3 */
export const salesFollowUp = ({ company, email }) => Boolean(String(company || '').trim()) && !isPersonalEmail(email);
