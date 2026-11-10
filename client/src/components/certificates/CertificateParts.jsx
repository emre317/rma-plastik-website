import { Award, Leaf, HardHat, Smile, PackageCheck, FileBadge, Landmark } from 'lucide-react';

/* Category look of a certificate: icon and accent colour (styles/certificates.css) */
export const CATEGORY_ICONS = {
  quality: Award,
  environment: Leaf,
  safety: HardHat,
  customer: Smile,
  product: PackageCheck,
  registration: Landmark,
  other: FileBadge,
};

/* "ISO 9001:2015" -> "iso-9001-2015", "İşletme Kayıt Belgesi" -> "isletme-kayit-belgesi" (page anchors) */
export function certificateAnchor(certificate) {
  const map = { ı: 'i', İ: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g', ü: 'u', Ü: 'u', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c' };
  return String(certificate.code || '')
    .replace(/[ıİşŞğĞüÜöÖçÇ]/g, (char) => map[char])
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const categoryOf = (certificate) => (CATEGORY_ICONS[certificate.category] ? certificate.category : 'other');

/*
  "ISO 9001:2015" -> { family: "ISO", number: "9001", year: "2015" } for the seal;
  a name that is not a standard ("İşletme Kayıt Belgesi") -> null (icon-only seal)
*/
export function splitCode(code = '') {
  const match = String(code).match(/^([A-Za-z]{2,6})\s+(\d[\d-]*)(?::\s*(\d{4}))?/);
  return match ? { family: match[1].toUpperCase(), number: match[2], year: match[3] || '' } : null;
}

/* Standards (ISO …) as opposed to registrations and other documents */
export const isStandard = (certificate) => certificate.category !== 'registration' && Boolean(splitCode(certificate.code));

/* Round "seal" with the standard number */
export function CertificateSeal({ certificate, size = 'md' }) {
  const parts = splitCode(certificate.code);
  const Icon = CATEGORY_ICONS[categoryOf(certificate)];

  if (!parts) {
    return (
      <span className={`certSeal certSeal-${size} certSeal-icon`} aria-hidden="true">
        <Icon className="certSealIcon" />
      </span>
    );
  }

  const { family, number, year } = parts;
  return (
    <span className={`certSeal certSeal-${size}`} aria-hidden="true">
      <Icon className="certSealIcon" />
      <small>{family}</small>
      <strong dir="ltr">{number}</strong>
      {year && <em dir="ltr">{year}</em>}
    </span>
  );
}
