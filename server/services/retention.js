/*
  How long website records are kept (KVKK set, Aydınlatma Metni section 9;
  technical note section D). MongoDB deletes a record by itself once its
  `expireAt` has passed (TTL index); a record without `expireAt` is kept.

    Teklif talebi            3 years after the last activity in the panel
    Katalog kaydı            2 years after the download or last contact;
                             kept while a marketing consent (box A or B) stands
    Onay / ret kayıtları     3 years after a consent ends (withdrawn), or after
                             the "no" was recorded
    Panel işlem kayıtları    2 years (models/AuditLog.js)
*/

export const QUOTE_YEARS = 3;
export const LEAD_YEARS = 2;
export const CONSENT_YEARS = 3;

export function yearsFrom(years, from = new Date()) {
  const date = new Date(from);
  date.setFullYear(date.getFullYear() + years);
  return date;
}

export const quoteExpiry = (from) => yearsFrom(QUOTE_YEARS, from);
export const leadExpiry = (from) => yearsFrom(LEAD_YEARS, from);
export const consentExpiry = (from) => yearsFrom(CONSENT_YEARS, from);
