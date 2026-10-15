import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import content from '@content';

// Turkish is always loaded: it is the fallback and the language of everything
// sent to the sales team; English and Arabic load only when a page needs them
import tr from './locales/tr';
import applyOverrides from './applyOverrides';
import applyCatalogue from './applyCatalogue';

import {
  DEFAULT_LANGUAGE,
  getLanguage,
  getLanguageFromPath,
  getPreferredLanguage,
} from './languages';

// Start in the URL's language so the first render is already correct
// (On the server/prerender there is no window; the renderer sets the language.)
const isBrowser = typeof window !== 'undefined';

const initialLanguage =
  (isBrowser && getLanguageFromPath(window.location.pathname)) ||
  (isBrowser ? getPreferredLanguage() : DEFAULT_LANGUAGE);

i18n
  .use(initReactI18next)
  .init({
    resources: {
      // Texts edited in the admin panel (published snapshot) override the defaults
      tr: { translation: applyCatalogue(applyOverrides(tr, content.texts?.tr), content, 'tr') },
    },
    // Lets the language be set before its texts are added (loadLanguage)
    partialBundledLanguages: true,
    lng: initialLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: ['tr', 'en', 'ar'],
    interpolation: {
      // React already escapes rendered values
      escapeValue: false,
    },
    returnNull: false,
  });

// Set <html lang/dir> before the first paint to avoid an LTR flash on Arabic pages
if (isBrowser && !window.location.pathname.startsWith('/admin')) {
  applyDocumentLanguage(
    initialLanguage,
    getLanguage(initialLanguage).dir
  );
}

const LOADERS = {
  en: () => import('./locales/en'),
  ar: () => import('./locales/ar'),
};

const loading = {};

/* Adds a language's texts (with the admin overrides) once; resolves when ready */
export function loadLanguage(code) {
  if (code === 'tr' || !LOADERS[code] || i18n.hasResourceBundle(code, 'translation')) {
    return Promise.resolve();
  }

  loading[code] ||= LOADERS[code]().then((module) => {
    i18n.addResourceBundle(code, 'translation', applyCatalogue(applyOverrides(module.default, content.texts?.[code]), content, code), true, true);
  });

  return loading[code];
}

/* Starts downloading the other languages in the background (language switch without waiting) */
export function prefetchLanguages() {
  Object.keys(LOADERS).forEach((code) => loadLanguage(code).catch(() => {}));
}

export { initialLanguage };

export default i18n;

export function applyDocumentLanguage(code, dir) {
  document.documentElement.lang = code;
  document.documentElement.dir = dir;
}
