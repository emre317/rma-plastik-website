/*
  Prerender entry (Node). Renders a public URL to static HTML plus its
  <head> tags, so search engines and social previews get real content
  without running JavaScript. Used by scripts/prerender.mjs at build time.
*/
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

import i18n from './i18n';
import App from './App';
import products from './data/products';
import { SUPPORTED_LANGUAGES } from './i18n/languages';
import { SeoCollectorContext, renderHeadTags } from './seo/Seo';
import { SITE_URL } from './seo/site';

export { SITE_URL };

const TECHNOLOGY_SLUGS = ['rotational-moulding', 'injection-moulding', 'blow-moulding'];

/* Every indexable public path, without the language prefix */
export function getPublicPaths() {
  return [
    '',
    '/company',
    '/products',
    ...products.map((product) => `/products/${product.slug}`),
    '/technologies',
    ...TECHNOLOGY_SLUGS.map((slug) => `/technologies/${slug}`),
    '/industries',
    '/engineering',
    '/contact',
  ];
}

export const languages = SUPPORTED_LANGUAGES.map(({ code, dir }) => ({ code, dir }));

export async function render(url, lang) {
  await i18n.changeLanguage(lang);

  const collector = { head: null };

  const html = renderToString(
    <SeoCollectorContext.Provider value={collector}>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </SeoCollectorContext.Provider>
  );

  return {
    html,
    head: collector.head ? renderHeadTags(collector.head) : '',
    noindex: Boolean(collector.head?.noindex),
  };
}
