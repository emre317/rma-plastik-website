import content from '@content';

/*
  Company contact details, used across the site.
  Values saved in the admin panel (Site Ayarları) override these defaults
  once the site is published.
*/
const saved = content.settings || {};
const pick = (value, fallback) => (value ? value : fallback);

const address = {
  // Non-breaking space keeps "No: 22" together when the line wraps
  street: pick(saved.address?.street, 'Mersin Tarsus OSB, Cumhuriyet Bulvarı No: 22').replace(/No: (\d)/, 'No: $1'),
  district: pick(saved.address?.district, 'Akdeniz, Mersin'),
  country: pick(saved.address?.country, 'Türkiye'),
};

const mapsQuery = `RMA Plastik, ${address.street.replace(/ /g, ' ')}, ${address.district}, ${address.country}`;

const phoneNumber = pick(saved.phone, '+903246764500');

const company = {
  name: 'RMA Plastik',
  email: pick(saved.email, 'info@rmaplastik.com'),
  phone: {
    display: pick(saved.phoneDisplay, '+90 (324) 676 4500'),
    href: `tel:${phoneNumber}`,
  },
  // WhatsApp number in international format, digits only (e.g. '905321234567').
  // Empty hides the WhatsApp bubble.
  whatsapp: pick(saved.whatsapp, '905366700969'),
  address,
  maps: {
    // Interactive map embed (no API key needed)
    embed: (lang = 'tr') =>
      `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery)}&hl=${lang}&z=15&output=embed`,
    open: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsQuery)}`,
  },
  social: {
    linkedin: pick(saved.social?.linkedin, 'https://www.linkedin.com/company/rmaplastik/'),
    instagram: pick(saved.social?.instagram, 'https://www.instagram.com/rmaplastik/'),
    youtube: pick(saved.social?.youtube, 'https://www.youtube.com/@rmaplastik5113'),
  },
  handles: {
    instagram: pick(saved.handles?.instagram, '@rmaplastik'),
    youtube: pick(saved.handles?.youtube, '@rmaplastik5113'),
  },
};

export default company;
