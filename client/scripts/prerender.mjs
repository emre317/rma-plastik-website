/*
  Build step 3/3 (see package.json "build"):
  - writes dist/<lang>/<path>/index.html for every public page
  - writes dist/sitemap.xml (with hreflang alternates) and dist/robots.txt
  dist/index.html stays the app shell (used for "/", admin and unknown URLs).
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, process.env.BUILD_OUT_DIR || 'dist');
const ssrDir = path.join(root, 'dist-ssr');

// file:// URL so the import also works with Windows paths (C:\...)
const { render, getPublicPaths, languages, SITE_URL } = await import(
  pathToFileURL(path.join(ssrDir, 'entry-server.js')).href
);

const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

function pageHtml({ html, head }, lang, dir) {
  return template
    .replace(/<html[^>]*>/, `<html lang="${lang}" dir="${dir}">`)
    // page-specific tags replace the shell defaults
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta name="description"[^>]*>/, '')
    .replace('</head>', `${head}</head>`)
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`);
}

const pathsByLang = Object.fromEntries(languages.map(({ code }) => [code, getPublicPaths(code)]));
let count = 0;

for (const { code, dir } of languages) {
  for (const rest of pathsByLang[code]) {
    const url = `/${code}${rest}`;
    const result = await render(url, code);
    const outDir = path.join(dist, url);

    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), pageHtml(result, code, dir));
    count += 1;
  }
}

/* "/" shell: point crawlers at the Turkish home page */
{
  const home = await render('/tr', 'tr');
  const shell = template
    .replace(/<meta name="description"[^>]*>/, '')
    .replace('</head>', `${home.head.replace(/<title>[\s\S]*?<\/title>/, '')}</head>`);

  fs.writeFileSync(path.join(dist, 'index.html'), shell);
}

/* sitemap.xml */
const today = new Date().toISOString().slice(0, 10);

const allPaths = [...new Set(Object.values(pathsByLang).flat())];

const urls = allPaths
  .flatMap((rest) => {
    // Only the languages this page exists in
    const available = languages.filter(({ code }) => pathsByLang[code].includes(rest));
    const fallback = available.some(({ code }) => code === 'tr') ? 'tr' : available[0].code;

    const alternates =
      available
        .map((alt) => `<xhtml:link rel="alternate" hreflang="${alt.code}" href="${SITE_URL}/${alt.code}${rest}"/>`)
        .join('') +
      `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/${fallback}${rest}"/>`;

    const depth = rest.split('/').length;
    const priority = rest === '' ? '1.0' : depth > 2 ? '0.7' : '0.8';
    const changefreq = rest === '' || rest === '/blog' ? 'weekly' : 'monthly';

    return available.map(
      ({ code }) =>
        `<url><loc>${SITE_URL}/${code}${rest}</loc><lastmod>${today}</lastmod>${alternates}` +
        `<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`
    );
  })
  .join('\n');

fs.writeFileSync(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`
);

fs.writeFileSync(
  path.join(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
);

fs.rmSync(ssrDir, { recursive: true, force: true });

console.log(`Prerendered ${count} pages, sitemap.xml and robots.txt for ${SITE_URL}`);
