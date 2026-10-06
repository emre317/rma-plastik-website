import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en';
import tr from './locales/tr';
import ar from './locales/ar';

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
      en: { translation: en },
      tr: { translation: tr },
      ar: { translation: ar },
    },
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

export default i18n;

export function applyDocumentLanguage(code, dir) {
  document.documentElement.lang = code;
  document.documentElement.dir = dir;
}
