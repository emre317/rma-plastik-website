/*
  Company contact details, used in the footer and on the Contact page.
  Keep this file as the single source of truth.
*/
const address = {
  // Non-breaking space keeps "No: 22" together when the line wraps
  street: 'Mersin Tarsus OSB, Cumhuriyet Bulvarı No:\u00a022',
  district: 'Akdeniz, Mersin',
  country: 'Türkiye',
};

const mapsQuery = `RMA Plastik, ${address.street.replace(/\u00a0/g, ' ')}, ${address.district}, ${address.country}`;

const company = {
  name: 'RMA Plastik',
  email: 'info@rmaplastik.com',
  phone: {
    display: '+90 (324) 676 4500',
    href: 'tel:+903246764500',
  },
  // WhatsApp number in international format, digits only (e.g. '905321234567').
  // Leave empty to hide the WhatsApp bubble.
  whatsapp: '905366700969',
  address,
  maps: {
    // Interactive map embed (no API key needed)
    embed: (lang = 'tr') =>
      `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery)}&hl=${lang}&z=15&output=embed`,
    open: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsQuery)}`,
  },
  social: {
    linkedin: 'https://www.linkedin.com/company/rmaplastik/',
    instagram: 'https://www.instagram.com/rmaplastik/',
    youtube: 'https://www.youtube.com/@rmaplastik5113',
  },
  handles: {
    instagram: '@rmaplastik',
    youtube: '@rmaplastik5113',
  },
};

export default company;
