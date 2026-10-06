import fs from 'node:fs';
import path from 'node:path';

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/*
  Injects the measurement snippets into index.html from client/.env:
    VITE_GTM_ID             GTM-XXXXXXX  (GA4, Ads, Meta Pixel, Hotjar live in GTM)
    VITE_GSC_VERIFICATION   Search Console "HTML tag" verification code (optional)
  Nothing is injected when a value is empty, so local builds stay tag-free.
*/
function siteTags(env) {
  const gtmId = /^GTM-[A-Z0-9]+$/.test(env.VITE_GTM_ID || '') ? env.VITE_GTM_ID : '';
  const gscCode = (env.VITE_GSC_VERIFICATION || '').replace(/[^\w-]/g, '');

  // Google Consent Mode v2: deny by default, restore a saved choice before GTM loads
  const consentDefaults = `
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});
gtag('set','ads_data_redaction',true);gtag('set','url_passthrough',true);
try{var c=JSON.parse(localStorage.getItem('rma_consent'));if(c&&c.version===1){gtag('consent','update',{analytics_storage:c.analytics?'granted':'denied',ad_storage:c.marketing?'granted':'denied',ad_user_data:c.marketing?'granted':'denied',ad_personalization:c.marketing?'granted':'denied'});}}catch(e){}`;

  const gtmLoader = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`;

  return {
    name: 'rma-site-tags',
    transformIndexHtml() {
      const tags = [
        { tag: 'script', children: consentDefaults, injectTo: 'head-prepend' },
      ];

      if (gtmId) {
        tags.push(
          { tag: 'link', attrs: { rel: 'preconnect', href: 'https://www.googletagmanager.com' }, injectTo: 'head' },
          { tag: 'script', children: gtmLoader, injectTo: 'head' },
          {
            tag: 'noscript',
            children: `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
            injectTo: 'body-prepend',
          }
        );
      }

      if (gscCode) {
        tags.push({
          tag: 'meta',
          attrs: { name: 'google-site-verification', content: gscCode },
          injectTo: 'head',
        });
      }

      return tags;
    },
  };
}

/*
  `@content` = published content snapshot from the admin panel
  (src/data/content.live.json, written by scripts/fetch-content.mjs on "Yayınla");
  falls back to the built-in defaults when it has never been fetched.
  Resolved on every import (not once at start-up), and the dev server reloads
  the page when a new snapshot is published.
*/
function contentModule() {
  const live = path.resolve('src/data/content.live.json');
  const fallback = path.resolve('src/data/content.default.json');

  return {
    name: 'rma-content',
    enforce: 'pre',

    resolveId(id) {
      if (id === '@content') {
        return fs.existsSync(live) ? live : fallback;
      }

      return null;
    },

    configureServer(server) {
      server.watcher.add(live);

      const reload = (file) => {
        if (path.resolve(file) !== live) {
          return;
        }

        server.moduleGraph.invalidateAll();
        server.ws.send({ type: 'full-reload' });
      };

      server.watcher.on('add', reload);
      server.watcher.on('change', reload);
      server.watcher.on('unlink', reload);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [contentModule(), react(), siteTags(env)],

    build: {
      // The admin "Publish" button builds into dist-next and swaps it in
      outDir: process.env.BUILD_OUT_DIR || 'dist',
    },

    server: {
      proxy: {
        '/api': 'http://localhost:5000',
        '/uploads': 'http://localhost:5000',
      },
    },
  };
});
