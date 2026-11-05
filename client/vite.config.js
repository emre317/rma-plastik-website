import fs from 'node:fs';
import path from 'node:path';

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/*
  Injects the measurement snippets into index.html from client/.env:
    VITE_GTM_ID             GTM-XXXXXXX  (GA4, Ads, Meta Pixel live in GTM; loaded after consent only)
    VITE_GSC_VERIFICATION   Search Console "HTML tag" verification code (optional)
  Nothing is injected when a value is empty, so local builds stay tag-free.
*/
function siteTags(env) {
  const gtmId = /^GTM-[A-Z0-9]+$/.test(env.VITE_GTM_ID || '') ? env.VITE_GTM_ID : '';
  const gscCode = (env.VITE_GSC_VERIFICATION || '').replace(/[^\w-]/g, '');

  // `js` class (scroll animations only hide content when JS runs) +
  // Google Consent Mode v2 in basic mode: everything denied, and GTM itself is
  // loaded only once the visitor allows analytics or marketing (KVKK). A saved
  // choice (version 2, at most 12 months old; analytics/consent.js) is applied
  // before GTM starts. window.rmaLoadGtm() is called by the cookie banner.
  const consentDefaults = `
document.documentElement.classList.add('js');
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'granted',security_storage:'granted'});
gtag('set','ads_data_redaction',true);
window.rmaLoadGtm=function(){var i=${JSON.stringify(gtmId)};if(!i||window.rmaGtmLoaded)return;window.rmaGtmLoaded=true;
dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});var j=document.createElement('script');j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;document.head.appendChild(j);};
try{var c=JSON.parse(localStorage.getItem('rma_consent'));if(c&&c.version===2&&Date.now()-new Date(c.savedAt).getTime()<365*864e5){gtag('consent','update',{analytics_storage:c.analytics?'granted':'denied',ad_storage:c.marketing?'granted':'denied',ad_user_data:c.marketing?'granted':'denied',ad_personalization:c.marketing?'granted':'denied'});if(c.analytics||c.marketing)window.rmaLoadGtm();}}catch(e){}`;

  return {
    name: 'rma-site-tags',
    transformIndexHtml() {
      const tags = [
        { tag: 'script', children: consentDefaults, injectTo: 'head-prepend' },
      ];

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
