import content from '@content';

import builtInCertificates from './certificates.builtin';

/*
  Quality and management system certificates. Certificates managed in the
  admin panel come from the published content snapshot (already without the
  hidden and expired ones); while the panel has none, the built-in list is used.
  Certificate: { code, category, number, holder, issuer, accreditation,
  issuedAt, validUntil, file, image, verifyUrl, i18n: { tr|en|ar: { title, scope } } }
*/
const certificates = Array.isArray(content.certificates) ? content.certificates : builtInCertificates;

/* Text in the site language, Turkish when that language is empty */
export function certificateText(certificate, field, lang) {
  return certificate.i18n?.[lang]?.[field] || certificate.i18n?.tr?.[field] || '';
}

/* "26.08.2027" / "26 Ağustos 2027" from "2027-08-26" */
export function certificateDate(value, lang = 'tr', style = 'long') {
  if (!value) return '';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  const locale = lang === 'ar' ? 'ar-u-nu-latn' : lang === 'en' ? 'en-GB' : 'tr-TR';
  return new Intl.DateTimeFormat(locale, style === 'short' ? { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' } : { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

export default certificates;
