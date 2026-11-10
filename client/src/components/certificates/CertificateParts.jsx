import { Award, Leaf, HardHat, Smile, PackageCheck, FileBadge } from 'lucide-react';

/* Category look of a certificate: icon and accent colour (styles/certificates.css) */
export const CATEGORY_ICONS = {
  quality: Award,
  environment: Leaf,
  safety: HardHat,
  customer: Smile,
  product: PackageCheck,
  other: FileBadge,
};

export const categoryOf = (certificate) => (CATEGORY_ICONS[certificate.category] ? certificate.category : 'other');

/* "ISO 9001:2015" -> { family: "ISO", number: "9001", year: "2015" } for the seal */
export function splitCode(code = '') {
  const match = String(code).match(/^([A-Za-zİ]+)\s*([\d-]+)(?::\s*(\d{4}))?/);
  return match ? { family: match[1].toUpperCase(), number: match[2], year: match[3] || '' } : { family: '', number: String(code), year: '' };
}

/* Round "seal" with the standard number */
export function CertificateSeal({ certificate, size = 'md' }) {
  const { family, number, year } = splitCode(certificate.code);
  const Icon = CATEGORY_ICONS[categoryOf(certificate)];

  return (
    <span className={`certSeal certSeal-${size}`} aria-hidden="true">
      <Icon className="certSealIcon" />
      <small>{family}</small>
      <strong dir="ltr">{number}</strong>
      {year && <em dir="ltr">{year}</em>}
    </span>
  );
}
