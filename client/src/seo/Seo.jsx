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
  languages,
  extraMeta = [],
  homeLabel,
  tagline,
}) {
  const rest = pathWithoutLanguage(pathname).replace(/\/+$/, '');
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | ${tagline}`;
  const canonical = absoluteUrl(`/${lang}${rest}`);

  // `languages`: only the languages this page exists in (e.g. a post written in Turkish only)
  const codes = (languages || SUPPORTED_LANGUAGES.map(({ code }) => code)).filter(Boolean);
  const defaultCode = codes.includes(DEFAULT_LANGUAGE) ? DEFAULT_LANGUAGE : codes[0] || lang;

  const alternates = [
    ...codes.map((code) => ({
      hreflang: code,
      href: absoluteUrl(`/${code}${rest}`),
    })),
    { hreflang: 'x-default', href: absoluteUrl(`/${defaultCode}${rest}`) },
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
    ...extraMeta,
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
      return `<meta ${key} content="${escapeAttr(item.content)}" data-seo>`;
    })
    .join('');

  const links =
    `<link rel="canonical" href="${escapeAttr(head.canonical)}" data-seo>` +
    head.alternates
      .map((alt) => `<link rel="alternate" hreflang="${alt.hreflang}" href="${escapeAttr(alt.href)}" data-seo>`)
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

/* Browser: head object -> document.head (previous page's tags are replaced) */
function applyHead(head) {
  document.title = head.title;

  document.head
    .querySelectorAll('[data-seo], meta[name="description"], link[rel="canonical"], link[rel="alternate"][hreflang], script#seo-jsonld')
    .forEach((element) => element.remove());

  const fragment = document.createDocumentFragment();

  head.meta.forEach((item) => {
    const element = document.createElement('meta');
    element.setAttribute(item.name ? 'name' : 'property', item.name || item.property);
    element.setAttribute('content', item.content);
    element.dataset.seo = '';
    fragment.appendChild(element);
  });

  const canonical = document.createElement('link');
  canonical.rel = 'canonical';
  canonical.href = head.canonical;
  canonical.dataset.seo = '';
  fragment.appendChild(canonical);

  head.alternates.forEach((alt) => {
    const element = document.createElement('link');
    element.rel = 'alternate';
    element.hreflang = alt.hreflang;
    element.href = alt.href;
    element.dataset.seo = '';
    fragment.appendChild(element);
  });

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'seo-jsonld';
  script.textContent = JSON.stringify(head.graph);
  fragment.appendChild(script);

  document.head.appendChild(fragment);
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
