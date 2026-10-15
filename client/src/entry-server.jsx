/*
  Prerender entry (Node). Renders a public URL to static HTML plus its
  <head> tags, so search engines and social previews get real content
  without running JavaScript. Used by scripts/prerender.mjs at build time.
*/
import { prerenderToNodeStream } from 'react-dom/static';
import { StaticRouter } from 'react-router-dom';

import i18n, { loadLanguage } from './i18n';
import App from './App';
import { modelPaths } from './data/productTables';
import { postsForLanguage } from './data/posts';
import { SUPPORTED_LANGUAGES } from './i18n/languages';
import { SeoCollectorContext, renderHeadTags } from './seo/Seo';
import { SITE_URL } from './seo/site';

export { SITE_URL };

/* Every indexable public path for a language, without the language prefix */
export function getPublicPaths(lang) {
  return [
    '',
    '/company',
    '/products',
    '/water-tanks',
    '/tank-finder',
    '/product-tables',
    ...modelPaths(),
    '/custom-molding',
    '/industries',
    '/contact',
    '/blog',
    // Articles only exist in the languages they were written in
    ...postsForLanguage(lang).map((post) => `/blog/${post.slug}`),
    '/videos',
  ];
}

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    let data = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      data += chunk;
    });
    stream.on('end', () => resolve(data));
    stream.on('error', reject);
  });
}

export const languages = SUPPORTED_LANGUAGES.map(({ code, dir }) => ({ code, dir }));

export async function render(url, lang) {
  await loadLanguage(lang);
  await i18n.changeLanguage(lang);

  const collector = { head: null };

  // Waits for code-split pages (React.lazy) so the HTML has the full page;
  // the browser then hydrates this markup instead of drawing it again
  const { prelude } = await prerenderToNodeStream(
    <SeoCollectorContext.Provider value={collector}>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </SeoCollectorContext.Provider>
  );

  const html = await streamToString(prelude);

  return {
    html,
    head: collector.head ? renderHeadTags(collector.head) : '',
    noindex: Boolean(collector.head?.noindex),
  };
}
