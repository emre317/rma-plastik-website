import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// Self-hosted fonts: no third-party requests, unicode-range subsets load on demand
// Variable fonts: every weight in one file; Inter also adjusts its letter shapes
// to the text size (optical size axis), tighter for headlines, opener for small text
import '@fontsource-variable/inter/opsz.css';
import '@fontsource-variable/manrope';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';

import i18n, { initialLanguage, loadLanguage } from './i18n';
import App from './App';
import './styles/global.css';

const root = document.getElementById('root');

const app = (
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Prerendered pages are hydrated (the HTML is reused, not drawn again);
// the app shell ("/", admin, unknown URLs) is rendered from scratch
// The page's language texts must be there before the first render (same text as the HTML)
loadLanguage(initialLanguage)
  // Re-applies the language now that its texts exist (resolvedLanguage, used for links)
  .then(() => i18n.changeLanguage(initialLanguage))
  .catch(() => {})
  .then(() => {
    if (root.hasChildNodes()) {
      ReactDOM.hydrateRoot(root, app);
    } else {
      ReactDOM.createRoot(root).render(app);
    }
  });