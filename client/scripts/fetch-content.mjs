/*
  Downloads the published content snapshot (product tables, texts, settings, posts, videos) from the API
  into src/data/content.live.json so the build bakes it into every page.

  - CONTENT_API_URL set (admin "Publish", or `npm run content:pull`): the download
    must succeed, otherwise the build stops instead of publishing stale content.
  - Not set: the step is skipped and the last snapshot (or the built-in defaults) is used.
  - CONTENT_API_TOKEN is sent as "Authorization: Bearer …" (the API requires it in
    production). PUBLISH_ID (set by the publish workflow) is passed on so the
    publish job records when its content was taken.
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const target = path.join(root, 'src/data/content.live.json');

const required = process.argv.includes('--required');
const url = process.env.CONTENT_API_URL || (required ? 'http://localhost:5000/api/content' : '');

if (!url) {
  console.log('Content: CONTENT_API_URL not set, using the existing snapshot.');
  process.exit(0);
}

try {
  const requestUrl = new URL(url);
  if (process.env.PUBLISH_ID && !requestUrl.searchParams.has('publishId')) {
    requestUrl.searchParams.set('publishId', process.env.PUBLISH_ID);
  }

  const headers = process.env.CONTENT_API_TOKEN ? { Authorization: `Bearer ${process.env.CONTENT_API_TOKEN}` } : {};
  const response = await fetch(requestUrl, { headers, signal: AbortSignal.timeout(30000) });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data?.version !== 1 || typeof data.texts !== 'object') {
    throw new Error('Unexpected response');
  }

  // Blog posts: Markdown is converted here, so visitors never download the converter
  const { renderMarkdown, readingMinutes } = await import(
    pathToFileURL(path.join(root, 'src/components/content/markdown.js')).href
  );

  (data.posts || []).forEach((post) => {
    Object.values(post.i18n || {}).forEach((text) => {
      text.bodyHtml = text.body ? renderMarkdown(text.body) : '';
      text.readingMinutes = readingMinutes(text.body);
      delete text.body;
    });
  });

  // No export markets in the database yet: keep the brochure markets
  if (!Array.isArray(data.exportMarkets) || data.exportMarkets.length === 0) {
    data.exportMarkets = null;
  }

  // FAQ and field photos have no built-in fallback
  data.faqs = Array.isArray(data.faqs) ? data.faqs : [];
  data.gallery = Array.isArray(data.gallery) ? data.gallery : [];

  // No reference projects in the database yet: keep the brochure projects
  if (!Array.isArray(data.projects) || data.projects.length === 0) {
    data.projects = null;
  }

  // No product groups or sectors in the database yet: keep the built-in ones
  if (!Array.isArray(data.productGroups) || data.productGroups.length === 0) {
    data.productGroups = null;
  }

  if (!Array.isArray(data.sectors) || data.sectors.length === 0) {
    data.sectors = null;
  }

  // No product tables in the database yet: keep the built-in brochure tables
  if (!Array.isArray(data.productFamilies) || data.productFamilies.length === 0) {
    data.productFamilies = null;
  }

  fs.writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`);

  console.log(`Content: ${data.productFamilies?.length ?? 'built-in'} product tables, saved to src/data/content.live.json`);
} catch (error) {
  // The address only, never the token
  console.error(`Content: could not load ${url.split('?')[0]} (${error.message})`);
  process.exit(1);
}
