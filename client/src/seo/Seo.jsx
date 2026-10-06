import { createContext, useContext, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../i18n/languages';
import {
  OG_IMAGE,
  OG_LOCALES,
  SITE_NAME,
  absoluteUrl,
  breadcrumbSchema,
  organizationSchema,
  websiteSchema,
} from './site';

/*
  Per-page <head> data: title, description, canonical, hreflang,
  Open Graph / Twitter and JSON-LD structured data.

  - In the browser the tags are written into document.head.
  - During prerender a collector is provided through context and the
    tags are serialised into the static HTML (see entry-server.jsx).
*/

export const SeoCollectorContext = createContext(null);

function pathWithoutLanguage(pathname) {
  return pathname.replace(/^\/[^/]+/, '') || '';
}

export function buildHead({
  lang,
  pathname,
  title,
  description,
  image = OG_IMAGE,
  type = 'website',
  noindex = false,
  jsonLd = [],
  breadcrumbs,
  homeLabel,
  tagline,
}) {
  const rest = pathWithoutLanguage(pathname).replace(/\/+$/, '');
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | ${tagline}`;
  const canonical = absoluteUrl(`/${lang}${rest}`);

  const alternates = [
    ...SUPPORTED_LANGUAGES.map(({ code }) => ({
      hreflang: code,
      href: absoluteUrl(`/${code}${rest}`),
    })),
    { hreflang: 'x-default', href: absoluteUrl(`/${DEFAULT_LANGUAGE}${rest}`) },
  ];

  const meta = [
    { name: 'description', content: description },
    { name: 'robots', content: noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large' },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:type', content: type },
    { property: 'og:title', content: fullTitle },
    { property: 'og:description', content: description },
    { property: 'og:url', content: canonical },
    { property: 'og:image', content: image },
    { property: 'og:locale', content: OG_LOCALES[lang] || OG_LOCALES.tr },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: fullTitle },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: image },
  ];

  // Breadcrumb paths are given without the language prefix
  const breadcrumbLd = breadcrumbs?.length
    ? [breadcrumbSchema([
        { name: homeLabel || SITE_NAME, path: `/${lang}` },
        ...breadcrumbs.map((item) => ({ ...item, path: `/${lang}${item.path}` })),
      ])]
    : [];

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [organizationSchema(), websiteSchema(lang), ...breadcrumbLd, ...jsonLd],
  };

  return { title: fullTitle, canonical, alternates, meta, graph, noindex };
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* Server: head object -> HTML string */
export function renderHeadTags(head) {
  const metaTags = head.meta
    .map((item) => {
      const key = item.name ? `name="${escapeAttr(item.name)}"` : `property="${escapeAttr(item.property)}"`;
      return `<meta ${key} content="${escapeAttr(item.content)}">`;
    })
    .join('');

  const links =
    `<link rel="canonical" href="${escapeAttr(head.canonical)}">` +
    head.alternates
      .map((alt) => `<link rel="alternate" hreflang="${alt.hreflang}" href="${escapeAttr(alt.href)}">`)
      .join('');

  // "<" is escaped so content can never close the script element
  const json = JSON.stringify(head.graph).replace(/</g, '\\u003c');

  return (
    `<title>${escapeAttr(head.title)}</title>` +
    metaTags +
    links +
    `<script type="application/ld+json" id="seo-jsonld">${json}</script>`
  );
}

/* Browser: head object -> document.head */
function upsert(selector, create) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = create();
    document.head.appendChild(element);
  }

  return element;
}

function applyHead(head) {
  document.title = head.title;

  head.meta.forEach((item) => {
    const attr = item.name ? 'name' : 'property';
    const key = item.name || item.property;

    upsert(`meta[${attr}="${key}"]`, () => {
      const element = document.createElement('meta');
      element.setAttribute(attr, key);
      return element;
    }).setAttribute('content', item.content);
  });

  upsert('link[rel="canonical"]', () => {
    const element = document.createElement('link');
    element.rel = 'canonical';
    return element;
  }).href = head.canonical;

  head.alternates.forEach((alt) => {
    upsert(`link[rel="alternate"][hreflang="${alt.hreflang}"]`, () => {
      const element = document.createElement('link');
      element.rel = 'alternate';
      element.hreflang = alt.hreflang;
      return element;
    }).href = alt.href;
  });

  upsert('script#seo-jsonld', () => {
    const element = document.createElement('script');
    element.type = 'application/ld+json';
    element.id = 'seo-jsonld';
    return element;
  }).textContent = JSON.stringify(head.graph);
}

export default function Seo(props) {
  const collector = useContext(SeoCollectorContext);
  const { lang } = useParams();
  const { pathname } = useLocation();
  const { t } = useTranslation();

  const head = buildHead({
    ...props,
    lang: lang || DEFAULT_LANGUAGE,
    pathname,
    tagline: t('meta.tagline'),
    homeLabel: t('nav.home', { defaultValue: SITE_NAME }),
  });

  // Prerender: hand the data to the renderer (effects do not run there)
  if (collector) {
    collector.head = head;
  }

  const key = JSON.stringify(head);

  useEffect(() => {
    applyHead(head);
    // `key` captures every field of `head`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}
