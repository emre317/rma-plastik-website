import company from '../data/company';

/*
  Public site address used for canonical URLs, hreflang, sitemap and
  structured data. Set VITE_SITE_URL in client/.env for the live domain.
*/
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || 'https://www.rmaplastik.com'
).replace(/\/+$/, '');

export const SITE_NAME = 'RMA Plastik';

export const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

export const OG_LOCALES = {
  tr: 'tr_TR',
  en: 'en_US',
  ar: 'ar_AR',
};

export function absoluteUrl(path = '/') {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function organizationSchema() {
  return {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: company.name,
    url: SITE_URL,
    logo: absoluteUrl('/logo.png'),
    email: company.email,
    telephone: company.phone.href.replace('tel:', ''),
    address: {
      '@type': 'PostalAddress',
      streetAddress: company.address.street.replace(/ /g, ' '),
      addressLocality: 'Mersin',
      addressCountry: 'TR',
    },
    sameAs: Object.values(company.social),
  };
}

export function websiteSchema(lang) {
  return {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: lang,
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

export function breadcrumbSchema(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
